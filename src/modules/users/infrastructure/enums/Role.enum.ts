import { ParseEnumPipe, ParseEnumPipeOptions } from "@nestjs/common/pipes";

export enum RoleEnum {
    CLIENT = 'client',
    EXPERT = 'expert',
    MERCHANT = 'merchant',
    AGENT = 'agent',
    ADMIN = 'admin'
}

export type Role = keyof typeof RoleEnum;
export const Roles = Object.values(RoleEnum);


export const hasRoles = (userRoles: RoleEnum[], ...requiredRoles: Role[]): boolean => {
    return requiredRoles.every((role) => userRoles.includes(RoleEnum[role]));
}

export const RolePipe = (options?: ParseEnumPipeOptions) =>  new ParseEnumPipe(RoleEnum, options);