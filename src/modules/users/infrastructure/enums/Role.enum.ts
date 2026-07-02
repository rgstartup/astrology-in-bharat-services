import { ParseEnumPipe, ParseEnumPipeOptions } from '@nestjs/common/pipes';

export enum RoleEnum {
  CLIENT = 'client',
  EXPERT = 'expert',
  MERCHANT = 'merchant',
  AGENT = 'agent',
  ADMIN = 'admin',
}

export type Role = keyof typeof RoleEnum;
export const Roles = Object.values(RoleEnum);

export const hasRoles = (
  userRoles: string | string[],
  ...requiredRoles: Role[]
): boolean => {
  let rolesArray: string[] = [];

  if (typeof userRoles === 'string') {
    rolesArray = userRoles
      .replace(/[{}]/g, '')
      .split(',')
      .map((r) => r.trim());
  } else if (Array.isArray(userRoles)) {
    rolesArray = userRoles.flatMap((r) =>
      typeof r === 'string'
        ? r
            .replace(/[{}]/g, '')
            .split(',')
            .map((s) => s.trim())
        : [r],
    );
  }

  return requiredRoles.some((role) => rolesArray.includes(RoleEnum[role]));
};

export const RolePipe = (options?: ParseEnumPipeOptions) =>
  new ParseEnumPipe(RoleEnum, options);
