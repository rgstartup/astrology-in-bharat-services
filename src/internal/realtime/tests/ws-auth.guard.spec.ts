import { describe, expect, it } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WsAuthGuard } from '../guards/ws-auth.guard';

describe('WsAuthGuard', () => {
  const guard = new WsAuthGuard();

  const createMockContext = (auth: any): ExecutionContext => {
    return {
      switchToWs: () => ({
        getClient: () => ({
          data: { auth },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('allows access when socket is authenticated', () => {
    const context = createMockContext({
      actorType: 'client',
      id: 1,
      clientId: 1,
      email: 'client@test.com',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws WsException when socket is unauthenticated / anonymous', () => {
    const context = createMockContext(null);

    expect(() => guard.canActivate(context)).toThrow(WsException);
  });
});
