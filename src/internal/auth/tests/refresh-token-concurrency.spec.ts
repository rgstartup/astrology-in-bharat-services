import { describe, expect, it, vi } from 'vitest';
import { RefreshTokenCacheService } from '../services/refresh-token-cache.service';
import {
  AccountSuspendedError,
  RefreshSessionExpiredOrRevokedError,
  TokenReuseDetectedError,
} from '../domain/errors/refresh-token.errors';
import { ExpertRefreshTokenUseCase } from '@/internal/actors/expert/auth/use-cases/expert-refresh-token.usecase';
import { ClientRefreshTokenUseCase } from '@/internal/actors/client/auth/use-cases/client-refresh-token.usecase';

/**
 * Deterministic test hasher.
 */
const mockHasher = {
  hash: async (raw: string) => `hash:${raw}`,
  verify: async (hash: string, raw: string) => hash === `hash:${raw}`,
};

/**
 * In-memory Redis mock supporting get/set.
 */
function createMockRedis() {
  const store = new Map<string, string>();
  return {
    store,
    service: {
      getClient: vi.fn(() => ({
        get: vi.fn(async (key: string) => store.get(key) || null),
        set: vi.fn(async (key: string, val: string) => {
          store.set(key, val);
          return 'OK';
        }),
      })),
    },
  };
}

/**
 * Config mock.
 */
const mockConfigService = {
  get: vi.fn(() => null),
};

describe('Token Family & Concurrency Refresh Tests', () => {
  const validUuid7 = '018f6f80-1234-7890-abcd-ef0123456789';
  const familyUuid7 = '018f6f80-5678-7890-abcd-ef0123456789';

  describe('RefreshTokenCacheService (Plaintext JSON)', () => {
    it('stores and retrieves cached tokens as direct JSON', async () => {
      const { service, store } = createMockRedis();
      const cacheService = new RefreshTokenCacheService(
        service as never,
        mockConfigService as never,
      );

      const tokens = {
        accessToken: 'access-jwt-token-123',
        refreshToken: `${validUuid7}.raw-next-token-456`,
      };

      await cacheService.saveRotationResult(
        'expert',
        validUuid7,
        'raw-input-000',
        tokens,
        15,
      );

      const cached = await cacheService.getRotationResult(
        'expert',
        validUuid7,
        'raw-input-000',
      );

      expect(cached).toEqual(tokens);

      // Verify stored as readable JSON in Redis (no AES cipher strings)
      const rawStored = Array.from(store.values())[0];
      expect(JSON.parse(rawStored)).toEqual(tokens);
    });

    it('returns null on cache miss', async () => {
      const { service } = createMockRedis();
      const cacheService = new RefreshTokenCacheService(
        service as never,
        mockConfigService as never,
      );

      const cached = await cacheService.getRotationResult(
        'expert',
        validUuid7,
        'non-existent-input',
      );

      expect(cached).toBeNull();
    });
  });

  describe('ExpertRefreshTokenUseCase Scenarios', () => {
    function createMockExpertTx(options: {
      getSession: () => {
        id: string;
        family_id: string;
        secret_hash: string;
        expires_at: Date;
        revoked: boolean;
        revoked_at?: Date | null;
        user_id: string;
      };
      onUpdate?: (data: {
        secret_hash?: string;
        revoked?: boolean;
        revoked_at?: Date;
      }) => void;
      expertBlocked?: boolean;
      userBlocked?: boolean;
    }) {
      return {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              for: vi.fn(() => ({
                limit: vi.fn(async () => [options.getSession()]),
              })),
            })),
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(async () => [
                  {
                    expert_id: 'expert-uuid-1',
                    expert_email: 'expert@test.com',
                    expert_is_blocked: options.expertBlocked ?? false,
                    user_email: 'expert@test.com',
                    user_is_blocked: options.userBlocked ?? false,
                  },
                ]),
              })),
            })),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn((data: any) => {
            options.onUpdate?.(data);
            return {
              where: vi.fn(async () => []),
            };
          }),
        })),
      };
    }

    it('Scenario 1: 10 parallel requests with T0 yield identical T1 and exactly 1 DB rotation', async () => {
      const { service } = createMockRedis();
      const cacheService = new RefreshTokenCacheService(
        service as never,
        mockConfigService as never,
      );

      let dbRotationCount = 0;
      let sessionState = {
        id: validUuid7,
        family_id: familyUuid7,
        secret_hash: 'hash:T0',
        expires_at: new Date(Date.now() + 100000),
        revoked: false,
        revoked_at: null as Date | null,
        user_id: 'user-uuid-1',
      };

      let lockQueue: Promise<void> = Promise.resolve();

      const mockDb = {
        transaction: vi.fn(async (callback) => {
          let releaseLock: () => void;
          const acquireLock = new Promise<void>((resolve) => {
            releaseLock = resolve;
          });
          const previousLock = lockQueue;
          lockQueue = previousLock.then(() => acquireLock);
          await previousLock;

          try {
            const tx = createMockExpertTx({
              getSession: () => sessionState,
              onUpdate: (data) => {
                if (data.secret_hash) {
                  sessionState.secret_hash = data.secret_hash;
                  dbRotationCount++;
                  // Assert revoked_at is NOT touched on rotation
                  expect(data.revoked_at).toBeUndefined();
                }
              },
            });
            return await callback(tx);
          } finally {
            releaseLock!();
          }
        }),
      };

      const mockTokenCrypto = {
        createAccessToken: vi.fn(async () => 'jwt.access.T1'),
        createRefreshToken: vi.fn(async () => ({ raw: 'T1', hash: 'hash:T1' })),
      };

      const useCase = new ExpertRefreshTokenUseCase(
        mockDb as never,
        mockTokenCrypto as never,
        mockHasher,
        cacheService,
      );

      const initialToken = `${validUuid7}.T0`;
      const requests = Array.from({ length: 10 }, () =>
        useCase.execute(initialToken),
      );

      const results = await Promise.all(requests);

      expect(dbRotationCount).toBe(1);
      for (const res of results) {
        expect(res).toEqual({
          accessToken: 'jwt.access.T1',
          refreshToken: `${validUuid7}.T1`,
        });
      }
    });

    it('Scenario 2: Replay of old token outside 15s grace revokes entire family and throws Token reuse detected', async () => {
      const { service } = createMockRedis(); // empty Redis -> grace expired
      const cacheService = new RefreshTokenCacheService(
        service as never,
        mockConfigService as never,
      );

      let sessionRevoked = false;
      let sessionRevokedAt: Date | null = null;

      let sessionState = {
        id: validUuid7,
        family_id: familyUuid7,
        // DB already on T1
        secret_hash: 'hash:T1',
        expires_at: new Date(Date.now() + 100000),
        revoked: false,
        revoked_at: null as Date | null,
        user_id: 'user-uuid-1',
      };

      const mockDb = {
        transaction: vi.fn(async (callback) => {
          const tx = createMockExpertTx({
            getSession: () => sessionState,
            onUpdate: (data) => {
              if (data.revoked !== undefined) {
                sessionRevoked = data.revoked;
                sessionRevokedAt = data.revoked_at ?? null;
                sessionState.revoked = data.revoked;
                sessionState.revoked_at = data.revoked_at ?? null;
              }
            },
          });
          return callback(tx);
        }),
      };

      const useCase = new ExpertRefreshTokenUseCase(
        mockDb as never,
        {} as never,
        mockHasher,
        cacheService,
      );

      // Present T0 which is expired from Redis and DB is at T1
      await expect(useCase.execute(`${validUuid7}.T0`)).rejects.toThrow(
        'Token reuse detected',
      );

      // Verify entire family revoked in DB with non-null revoked_at
      expect(sessionRevoked).toBe(true);
      expect(sessionRevokedAt).toBeInstanceOf(Date);

      // Subsequent attempt with current token T1 now fails because session is revoked
      await expect(useCase.execute(`${validUuid7}.T1`)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('Scenario 3: Blocked account throws AccountSuspendedError', async () => {
      const { service } = createMockRedis();
      const cacheService = new RefreshTokenCacheService(
        service as never,
        mockConfigService as never,
      );

      const mockDb = {
        transaction: vi.fn(async (callback) => {
          const tx = createMockExpertTx({
            getSession: () => ({
              id: validUuid7,
              family_id: familyUuid7,
              secret_hash: 'hash:T0',
              expires_at: new Date(Date.now() + 100000),
              revoked: false,
              user_id: 'user-uuid-1',
            }),
            expertBlocked: true,
          });
          return callback(tx);
        }),
      };

      const useCase = new ExpertRefreshTokenUseCase(
        mockDb as never,
        {} as never,
        mockHasher,
        cacheService,
      );

      await expect(useCase.execute(`${validUuid7}.T0`)).rejects.toThrow(
        AccountSuspendedError,
      );
    });
  });

  describe('ClientRefreshTokenUseCase Scenarios', () => {
    it('Client use case performs identical rotation, 15s grace caching, and theft revocation', async () => {
      const { service, store } = createMockRedis();
      const cacheService = new RefreshTokenCacheService(
        service as never,
        mockConfigService as never,
      );

      let sessionRevoked = false;
      let sessionState = {
        id: validUuid7,
        family_id: familyUuid7,
        secret_hash: 'hash:C0',
        expires_at: new Date(Date.now() + 100000),
        revoked: false,
        revoked_at: null as Date | null,
        user_id: 'client-user-1',
      };

      const mockDb = {
        transaction: vi.fn(async (callback) => {
          let selectCallCount = 0;
          const tx = {
            select: vi.fn(() => ({
              from: vi.fn(() => ({
                where: vi.fn(() => ({
                  for: vi.fn(() => ({
                    limit: vi.fn(async () => {
                      return [{ ...sessionState }];
                    }),
                  })),
                  limit: vi.fn(async () => {
                    selectCallCount++;
                    if (selectCallCount === 1) {
                      return [{ is_blocked: false }];
                    }
                    return [
                      {
                        id: 'client-uuid-1',
                        email: 'client@test.com',
                        is_blocked: false,
                      },
                    ];
                  }),
                })),
              })),
            })),
            update: vi.fn(() => ({
              set: vi.fn((data: any) => {
                if (data.secret_hash) sessionState.secret_hash = data.secret_hash;
                if (data.revoked !== undefined) {
                  sessionRevoked = data.revoked;
                  sessionState.revoked = data.revoked;
                }
                return { where: vi.fn(async () => []) };
              }),
            })),
          };
          return callback(tx);
        }),
      };

      const mockTokenCrypto = {
        createAccessToken: vi.fn(async () => 'jwt.client.access.C1'),
        createRefreshToken: vi.fn(async () => ({ raw: 'C1', hash: 'hash:C1' })),
      };

      const useCase = new ClientRefreshTokenUseCase(
        mockDb as never,
        mockTokenCrypto as never,
        mockHasher,
        cacheService,
      );

      // Call 1: Rotate C0 -> C1
      const res1 = await useCase.execute(`${validUuid7}.C0`);
      expect(res1.refreshToken).toBe(`${validUuid7}.C1`);

      // Call 2: Within 15s grace -> returns cached C1
      const res2 = await useCase.execute(`${validUuid7}.C0`);
      expect(res2).toEqual(res1);

      // Simulate expired Redis cache
      store.clear();

      // Call 3: Reuse of C0 past 15s -> revokes family and throws 'Token reuse detected'
      await expect(useCase.execute(`${validUuid7}.C0`)).rejects.toThrow(
        'Token reuse detected',
      );
      expect(sessionRevoked).toBe(true);
    });
  });
});
