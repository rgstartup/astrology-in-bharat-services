import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientRealtimeAuthVerifier } from '../client-realtime-auth.verifier';
import type { JwtService } from '@nestjs/jwt';

describe('ClientRealtimeAuthVerifier', () => {
  let verifier: ClientRealtimeAuthVerifier;
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
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    };

    verifier = new ClientRealtimeAuthVerifier(
      mockJwtService as unknown as JwtService,
      mockDb,
    );
  });

  it('verifies valid client token and returns ClientSocketIdentity', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 10,
      email: 'client@test.com',
    });

    mockDb.limit.mockResolvedValue([
      {
        id: 10,
        email: 'client@test.com',
        is_blocked: false,
      },
    ]);

    const result = await verifier.verify('valid-client-jwt');

    expect(result).toEqual({
      actorType: 'client',
      id: 10,
      clientId: 10,
      email: 'client@test.com',
    });
  });

  it('returns null when client is blocked', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 10,
      email: 'client@test.com',
    });

    mockDb.limit.mockResolvedValue([
      {
        id: 10,
        email: 'client@test.com',
        is_blocked: true,
      },
    ]);

    const result = await verifier.verify('blocked-client-jwt');

    expect(result).toBeNull();
  });

  it('returns null when client account does not exist', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 999,
      email: 'unknown@test.com',
    });

    mockDb.limit.mockResolvedValue([]);

    const result = await verifier.verify('unknown-jwt');

    expect(result).toBeNull();
  });

  it('returns null when jwt verification fails', async () => {
    mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    const result = await verifier.verify('corrupted-jwt');

    expect(result).toBeNull();
  });
});
