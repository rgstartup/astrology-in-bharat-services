import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

export interface IAccessTokenPayload {
  sub: string; // user ID
  email: string;
  roles: RoleEnum[];
  profile?: string;
}

export interface IUser extends IAccessTokenPayload {
  id: string;
}
