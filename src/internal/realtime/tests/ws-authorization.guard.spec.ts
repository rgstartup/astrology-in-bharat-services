import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { WsAuthorizationGuard } from '../guards/ws-authorization.guard';

describe('WsAuthorizationGuard', () => {
  let guard: WsAuthorizationGuard;
  let mockReflector: {
    getAllAndOverride: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new WsAuthorizationGuard(mockReflector as unknown as Reflector);
  });

  const createMockContext = (auth: any): ExecutionContext => {
    return {
      switchToWs: () => ({
        getClient: () => ({
          data: { auth },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('allows access when no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({
      actorType: 'client',
      id: 1,
      clientId: 1,
      email: 'client@test.com',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when actorType matches required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['expert']);
    const context = createMockContext({
      actorType: 'expert',
      id: 42,
      expertId: 42,
      email: 'expert@test.com',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects access when actorType does not match required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['expert']);
    const context = createMockContext({
      actorType: 'client',
      id: 1,
      clientId: 1,
      email: 'client@test.com',
    });

    expect(() => guard.canActivate(context)).toThrow(WsException);
  });

  it('rejects unauthenticated socket even when roles are defined', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['client']);
    const context = createMockContext(null);

    expect(() => guard.canActivate(context)).toThrow(WsException);
  });
});
