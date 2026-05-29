import { SetMetadata } from '@nestjs/common';
import { Role, RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

export const ROLES_KEY = Symbol('handler-roles');

export const Roles = (...roles: Role[]) => 
  SetMetadata(ROLES_KEY, roles);
