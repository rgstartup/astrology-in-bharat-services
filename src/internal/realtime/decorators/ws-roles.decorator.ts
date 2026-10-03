import { SetMetadata } from '@nestjs/common';
import type { RealtimeActorType } from '../types/socket-auth.types';

export const WS_ROLES_KEY = 'ws_roles';
export const WsRoles = (...roles: RealtimeActorType[]) =>
  SetMetadata(WS_ROLES_KEY, roles);
