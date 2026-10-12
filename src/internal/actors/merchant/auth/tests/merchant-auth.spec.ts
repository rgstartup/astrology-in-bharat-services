import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MerchantJwtStrategy } from '../strategies/jwt.strategy';
import { MerchantLoginWithEmailUseCase } from '../use-cases/merchant-login-with-email.usecase';
import { MerchantRefreshTokenUseCase } from '../use-cases/merchant-refresh-token.usecase';
import { InitiateMerchantEmailRegistrationUseCase } from '../use-cases/initiate-merchant-email-registration.usecase';
import { CompleteMerchantEmailRegistrationUseCase } from '../use-cases/complete-merchant-email-registration.usecase';
import { MerchantStatus, PlatformEnum } from '@/core/enums';
import type { IHasher } from '@/shared/contracts/hasher.contract';
import type { MerchantTokenCryptoService } from '../services/token-crypto.service';

describe('Merchant Auth Module', () => {
  let mockHasher: IHasher;
  let mockTokenCrypto: Partial<MerchantTokenCryptoService>;
  let mockEvents: Partial<EventEmitter2>;

  beforeEach(() => {
    mockHasher = {
      hash: vi.fn().mockResolvedValue('hashed-password'),
      verify: vi.fn().mockResolvedValue(true),
    };

    mockTokenCrypto = {
      createAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
      createRefreshToken: vi.fn().mockResolvedValue({
        raw: 'mock-refresh-raw',
        hash: 'mock-refresh-hash',
      }),
      signTemporaryToken: vi.fn().mockReturnValue('mock-temp-token'),
      verifyJwt: vi.fn().mockResolvedValue({
        email: 'merchant@example.com',
        platform: PlatformEnum.MERCHANT,
      }),
    };

    mockEvents = {
      emit: vi.fn(),
    };
  });

  describe('MerchantJwtStrategy', () => {
    it('should validate and return merchant payload', async () => {
      const mockDb = {
        query: {
          merchantAccounts: {
            findFirst: vi.fn().mockResolvedValue({
              id: 10,
              is_blocked: false,
              email: 'merchant@example.com',
              user: { email: 'user@example.com', is_blocked: false },
            }),
          },
        },
      } as any;

      const mockConfig = {
        get: vi.fn().mockReturnValue({ jwtSecret: 'mock-secret' }),
      } as unknown as ConfigService;

      const strategy = new MerchantJwtStrategy(mockConfig, mockDb);
      const result = await strategy.validate({ sub: 10, email: 'merchant@example.com' });

      expect(result).toEqual({
        sub: 10,
        email: 'merchant@example.com',
      });
    });

    it('should throw UnauthorizedException if merchant is blocked', async () => {
      const mockDb = {
        query: {
          merchantAccounts: {
            findFirst: vi.fn().mockResolvedValue({
              id: 10,
              is_blocked: true,
              user: { is_blocked: false },
            }),
          },
        },
      } as any;

      const mockConfig = {
        get: vi.fn().mockReturnValue({ jwtSecret: 'mock-secret' }),
      } as unknown as ConfigService;

      const strategy = new MerchantJwtStrategy(mockConfig, mockDb);
      await expect(
        strategy.validate({ sub: 10, email: 'merchant@example.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('MerchantLoginWithEmailUseCase', () => {
    it('should login successfully with valid credentials', async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn().mockResolvedValue({
              id: 1,
              email: 'merchant@example.com',
              password: 'hashed-password',
              email_verified_at: new Date(),
              is_blocked: false,
            }),
          },
          merchantAccounts: {
            findFirst: vi.fn().mockResolvedValue({
              id: 10,
              name: 'Vedic Shop',
              email: 'merchant@example.com',
              shop_name: 'Vedic Store',
              status: MerchantStatus.ACTIVE,
              is_blocked: false,
            }),
          },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: '018f0000-0000-7000-0000-000000000001' },
            ]),
          }),
        }),
      } as any;

      const useCase = new MerchantLoginWithEmailUseCase(
        mockDb,
        mockTokenCrypto as any,
        mockHasher,
      );

      const result = await useCase.execute({
        email: 'merchant@example.com',
        password: 'valid-password',
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toContain('mock-refresh-raw');
      expect(result.merchant.id).toBe(10);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      } as any;

      const useCase = new MerchantLoginWithEmailUseCase(
        mockDb,
        mockTokenCrypto as any,
        mockHasher,
      );

      await expect(
        useCase.execute({
          email: 'notfound@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if email not verified', async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn().mockResolvedValue({
              id: 1,
              email: 'merchant@example.com',
              password: 'hashed-password',
              email_verified_at: null,
              is_blocked: false,
            }),
          },
        },
      } as any;

      const useCase = new MerchantLoginWithEmailUseCase(
        mockDb,
        mockTokenCrypto as any,
        mockHasher,
      );

      await expect(
        useCase.execute({
          email: 'merchant@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('MerchantRefreshTokenUseCase', () => {
    it('should rotate refresh token successfully', async () => {
      const validSessionId = '018f0000-0000-7000-8000-000000000001';
      const mockDb = {
        query: {
          sessions: {
            findFirst: vi.fn().mockResolvedValue({
              id: validSessionId,
              type: 'refresh_token',
              revoked: false,
              expires_at: new Date(Date.now() + 100000),
              secret_hash: 'mock-refresh-hash',
              user: { id: 1, email: 'merchant@example.com', is_blocked: false },
            }),
          },
          merchantAccounts: {
            findFirst: vi.fn().mockResolvedValue({
              id: 10,
              email: 'merchant@example.com',
              is_blocked: false,
              user: { id: 1, is_blocked: false },
            }),
          },
        },
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new MerchantRefreshTokenUseCase(
        mockDb,
        mockTokenCrypto as any,
        mockHasher,
      );

      const result = await useCase.execute(`${validSessionId}.valid-raw`);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe(`${validSessionId}.mock-refresh-raw`);
    });

    it('should throw UnauthorizedException for malformed refresh token', async () => {
      const mockDb = {} as any;
      const useCase = new MerchantRefreshTokenUseCase(
        mockDb,
        mockTokenCrypto as any,
        mockHasher,
      );

      await expect(useCase.execute('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('InitiateMerchantEmailRegistrationUseCase', () => {
    it('should create user if new and emit verification event', async () => {
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            query: {
              users: {
                findFirst: vi.fn().mockResolvedValue(null),
              },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  { id: 1, email: 'new@example.com', platform: PlatformEnum.MERCHANT },
                ]),
              }),
            }),
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new InitiateMerchantEmailRegistrationUseCase(
        mockDb,
        mockEvents as any,
        mockTokenCrypto as any,
      );

      const result = await useCase.execute('new@example.com');
      expect(result.message).toContain('Verification email sent');
      expect(mockEvents.emit).toHaveBeenCalledWith(
        'auth.merchant.registered',
        expect.objectContaining({
          email: 'new@example.com',
          verification_token: 'mock-temp-token',
        }),
      );
    });

    it('should throw ConflictException if already registered and verified', async () => {
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            query: {
              users: {
                findFirst: vi.fn().mockResolvedValue({
                  id: 1,
                  email: 'existing@example.com',
                  email_verified_at: new Date(),
                }),
              },
            },
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new InitiateMerchantEmailRegistrationUseCase(
        mockDb,
        mockEvents as any,
        mockTokenCrypto as any,
      );

      await expect(useCase.execute('existing@example.com')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('CompleteMerchantEmailRegistrationUseCase', () => {
    it('should complete registration, update user and account, and return tokens', async () => {
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            query: {
              users: {
                findFirst: vi.fn().mockResolvedValue({
                  id: 1,
                  email: 'merchant@example.com',
                  email_verified_at: null,
                }),
              },
              merchantAccounts: {
                findFirst: vi.fn().mockResolvedValue(null),
              },
            },
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([
                    { id: 1, email: 'merchant@example.com', avatar: null },
                  ]),
                }),
              }),
            }),
            insert: vi.fn()
              .mockReturnValueOnce({
                values: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([
                    { id: 10, email: 'merchant@example.com' },
                  ]),
                }),
              })
              .mockReturnValueOnce({
                values: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([
                    { id: '018f0000-0000-7000-8000-000000000001' },
                  ]),
                }),
              }),
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new CompleteMerchantEmailRegistrationUseCase(
        mockDb,
        mockTokenCrypto as any,
        mockHasher,
      );

      const result = await useCase.execute({
        token: 'mock-valid-token',
        email: 'merchant@example.com',
        name: 'Vedic Merchant',
        password: 'new-password',
        shop_name: 'Vedic Shop',
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toContain('mock-refresh-raw');
    });
  });
});
