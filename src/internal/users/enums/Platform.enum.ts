export enum PlatformEnum {
  CLIENT = 'client',
  EXPERT = 'expert',
  MERCHANT = 'merchant',
  AGENT = 'agent',
  ADMIN = 'admin',
}

export type Platform = keyof typeof PlatformEnum;
export const Platforms = Object.values(PlatformEnum);
