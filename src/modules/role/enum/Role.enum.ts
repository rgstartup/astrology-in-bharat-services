export enum RoleEnum {
    CLIENT = 'client',
    EXPERT = 'expert',
    MERCHANT = 'merchant',
    AGENT = 'agent',
    ADMIN = 'admin'
}

export type Role = keyof typeof RoleEnum;

export const Roles = Object.values(RoleEnum)

