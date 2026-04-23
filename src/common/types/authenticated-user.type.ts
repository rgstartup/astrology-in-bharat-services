import { BetterAuthUser } from './better-auth-user.type';

export interface AuthenticatedUser extends BetterAuthUser {
  localUserId: number;
}
