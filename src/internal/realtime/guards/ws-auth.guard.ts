import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { RealtimeSocket } from '../types/socket-data.types';

@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client: RealtimeSocket = context.switchToWs().getClient();
    const auth = client?.data?.auth;

    if (!auth) {
      throw new WsException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required for this operation',
      });
    }

    return true;
  }
}
