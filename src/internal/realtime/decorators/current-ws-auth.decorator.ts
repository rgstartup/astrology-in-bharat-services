import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';
import type { RealtimeSocket } from '../types/socket-data.types';

export const CurrentWsAuth = createParamDecorator(
  <K extends keyof AuthenticatedSocketIdentity>(
    data: K | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedSocketIdentity[K] | AuthenticatedSocketIdentity | null => {
    const client = ctx.switchToWs().getClient<RealtimeSocket>();
    const auth = client?.data?.auth;
    if (!auth) {
      return null;
    }
    if (data !== undefined) {
      return auth[data];
    }
    return auth;
  },
);
