import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'handler-roles';
export type DEFAULT_ROLES = 'admin' | 'client' | 'agent' | 'expert';

export const Roles = (...roles: DEFAULT_ROLES[]) =>
  SetMetadata(ROLES_KEY, roles);
