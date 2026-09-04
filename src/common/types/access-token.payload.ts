import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { AdminPermission } from '@/modules/users/infrastructure/enums/AdminPermission.enum';

export interface IAccessTokenPayload {
  sub: string; // user ID
  email: string;
  role: RoleEnum;
  profile?: string;
  // Sub-admin ke allowed pages. Super admin ke liye null (full access).
  admin_permissions?: AdminPermission[] | null;
}

export interface IUser extends Omit<IAccessTokenPayload, 'sub'> {
  id: string;
}

export interface IAccessTokenPayloadClient {
  sub: string;
  email: string;
}

export interface IAccessTokenPayloadExpert {
  sub: string;
  email: string;
}
