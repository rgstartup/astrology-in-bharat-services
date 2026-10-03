import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpertRealtimeAuthVerifier } from '../expert-realtime-auth.verifier';
import type { JwtService } from '@nestjs/jwt';

describe('ExpertRealtimeAuthVerifier', () => {
  let verifier: ExpertRealtimeAuthVerifier;
  let mockJwtService: {
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let mockDb: any;

  beforeEach(() => {
    mockJwtService = {
      verifyAsync: vi.fn(),
    };

    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    };

    verifier = new ExpertRealtimeAuthVerifier(
      mockJwtService as unknown as JwtService,
      mockDb,
    );
  });

  it('verifies valid expert token and returns ExpertSocketIdentity', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 42,
      email: 'expert@test.com',
    });

    mockDb.limit.mockResolvedValue([
      {
        id: 42,
        email: 'expert@test.com',
        is_blocked: false,
        user_email: 'user_expert@test.com',
        user_is_blocked: false,
      },
    ]);

    const result = await verifier.verify('valid-expert-jwt');

    expect(result).toEqual({
      actorType: 'expert',
      id: 42,
      expertId: 42,
      email: 'expert@test.com',
    });
  });

  it('returns null when expert account is blocked', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 42,
      email: 'expert@test.com',
    });

    mockDb.limit.mockResolvedValue([
      {
        id: 42,
        email: 'expert@test.com',
        is_blocked: true,
        user_email: 'user@test.com',
        user_is_blocked: false,
      },
    ]);

    const result = await verifier.verify('blocked-expert-jwt');

    expect(result).toBeNull();
  });

  it('returns null when underlying user is blocked', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 42,
      email: 'expert@test.com',
    });

    mockDb.limit.mockResolvedValue([
      {
        id: 42,
        email: 'expert@test.com',
        is_blocked: false,
        user_email: 'user@test.com',
        user_is_blocked: true,
      },
    ]);

    const result = await verifier.verify('blocked-user-expert-jwt');

    expect(result).toBeNull();
  });

  it('returns null when expert account does not exist', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 999,
      email: 'unknown@test.com',
    });

    mockDb.limit.mockResolvedValue([]);

    const result = await verifier.verify('unknown-jwt');

    expect(result).toBeNull();
  });
});
