import { SetMetadata } from '@nestjs/common';
import { RoleEnum } from '@/modules/role/enum/Role.enum';

export const ROLES_KEY = 'handler-roles';
export type DEFAULT_ROLES = RoleEnum | 'user';

export const Roles = (...roles: (DEFAULT_ROLES | string)[]) =>
  SetMetadata(ROLES_KEY, roles);
