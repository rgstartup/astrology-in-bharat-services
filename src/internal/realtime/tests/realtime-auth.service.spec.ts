import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeAuthService } from '../services/realtime-auth.service';
import type { IRealtimeAuthVerifier } from '../contracts/realtime-auth-verifier.contract';

describe('RealtimeAuthService', () => {
  let authService: RealtimeAuthService;
  let mockClientVerifier: IRealtimeAuthVerifier;
  let mockExpertVerifier: IRealtimeAuthVerifier;

  beforeEach(() => {
    mockClientVerifier = {
      actorType: 'client',
      verify: vi.fn(),
    };
    mockExpertVerifier = {
      actorType: 'expert',
      verify: vi.fn(),
    };

    authService = new RealtimeAuthService([
      mockClientVerifier,
      mockExpertVerifier,
    ]);
  });

  it('authenticates client token using client verifier', async () => {
    vi.spyOn(mockClientVerifier, 'verify').mockResolvedValue({
      actorType: 'client',
      id: 10,
      clientId: 10,
      email: 'client@test.com',
    });

    const result = await authService.authenticate('valid-client-token');

    expect(result).toEqual({
      actorType: 'client',
      id: 10,
      clientId: 10,
      email: 'client@test.com',
    });
    expect(mockClientVerifier.verify).toHaveBeenCalledWith('valid-client-token');
  });

  it('authenticates expert token using expert verifier', async () => {
    vi.spyOn(mockClientVerifier, 'verify').mockResolvedValue(null);
    vi.spyOn(mockExpertVerifier, 'verify').mockResolvedValue({
      actorType: 'expert',
      id: 42,
      expertId: 42,
      email: 'expert@test.com',
    });

    const result = await authService.authenticate('valid-expert-token');

    expect(result).toEqual({
      actorType: 'expert',
      id: 42,
      expertId: 42,
      email: 'expert@test.com',
    });
  });

  it('uses actorHint when provided to direct verification', async () => {
    vi.spyOn(mockExpertVerifier, 'verify').mockResolvedValue({
      actorType: 'expert',
      id: 42,
      expertId: 42,
      email: 'expert@test.com',
    });

    const result = await authService.authenticate('expert-token', 'expert');

    expect(mockExpertVerifier.verify).toHaveBeenCalledWith('expert-token');
    expect(mockClientVerifier.verify).not.toHaveBeenCalled();
    expect(result?.actorType).toBe('expert');
  });

  it('returns null when all verifiers fail or return null', async () => {
    vi.spyOn(mockClientVerifier, 'verify').mockResolvedValue(null);
    vi.spyOn(mockExpertVerifier, 'verify').mockResolvedValue(null);

    const result = await authService.authenticate('invalid-token');

    expect(result).toBeNull();
  });

  it('returns null when empty or whitespace token is provided', async () => {
    const result = await authService.authenticate('   ');
    expect(result).toBeNull();
  });
});
