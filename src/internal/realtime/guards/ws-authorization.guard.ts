import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { WS_ROLES_KEY } from '../decorators/ws-roles.decorator';
import type { RealtimeActorType } from '../types/socket-auth.types';
import type { RealtimeSocket } from '../types/socket-data.types';

@Injectable()
export class WsAuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RealtimeActorType[]>(
      WS_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const client: RealtimeSocket = context.switchToWs().getClient();
    const auth = client?.data?.auth;

    if (!auth) {
      throw new WsException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required for this operation',
      });
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(auth.actorType)) {
        throw new WsException({
          code: 'FORBIDDEN',
          message: `Access denied. Required actor: ${requiredRoles.join(', ')}`,
        });
      }
    }

    return true;
  }
}
