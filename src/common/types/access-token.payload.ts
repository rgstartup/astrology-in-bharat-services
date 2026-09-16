import { RoleEnum } from '@/modules/users/enums/Role.enum';
import { AdminPermission } from '@/modules/users/enums/AdminPermission.enum';

export interface IAccessTokenPayload {
  sub: number; // user ID
  email: string;
  role: RoleEnum;
  profile?: number;
  // Sub-admin ke allowed pages. Super admin ke liye null (full access).
  admin_permissions?: AdminPermission[] | null;
}

export interface IUser extends Omit<IAccessTokenPayload, 'sub'> {
  id: number;
}

export interface IAccessTokenPayloadClient {
  sub: number;
  email: string;
}

export interface IAccessTokenPayloadExpert {
  sub: number;
  email: string;
}

export interface IExpert {
  sub: number;
  email: string;
}

export interface IAccessTokenPayloadMerchant {
  sub: number;
  email: string;
}

export interface IMerchant {
  sub: number;
  email: string;
}

