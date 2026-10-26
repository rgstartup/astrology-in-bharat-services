import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { JwtLogoutAuthGuard } from '../guards/logout-auth.guard';

describe('Legacy JwtLogoutAuthGuard', () => {
  let guard: JwtLogoutAuthGuard;
  let mockJwtService: any;

  beforeEach(() => {
    mockJwtService = {
      verifyAsync: vi.fn(),
    };
    guard = new JwtLogoutAuthGuard(mockJwtService);
  });

  const createMockContext = (cookies: Record<string, string> = {}, authHeader?: string) => {
    const req: Partial<Request> = {
      cookies,
      headers: {
        authorization: authHeader,
      },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it('permits request and sets user when token is expired but validly signed', async () => {
    mockJwtService.verifyAsync.mockResolvedValueOnce({
      sub: 999,
      email: 'legacy@example.com',
    });

    const context = createMockContext({ accessToken: 'legacy.expired.token' });
    const req = context.switchToHttp().getRequest() as any;

    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('legacy.expired.token', {
      ignoreExpiration: true,
    });
    expect(req.user).toEqual({
      id: '999',
      sub: 999,
      email: 'legacy@example.com',
    });
  });

  it('permits request when token is missing', async () => {
    const context = createMockContext({});
    const req = context.switchToHttp().getRequest() as any;

    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
    expect(req.user).toBeUndefined();
  });
});
