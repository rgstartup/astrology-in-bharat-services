import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { EmailNotVerifiedError, RequiredRoleMissingError } from '../errors/email-not-verified.error';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

export class AuthPolicy {
  static ensureCanLogin(user: User, role: RoleEnum) {
    return AuthPolicy.ensureEmailVerified(user) && AuthPolicy.ensureHasRequiredRole(user, role);
  }

  static ensureEmailVerified(user: User) {
    if (!user.email_verified_at) {
      throw new EmailNotVerifiedError();
    }

    return true;
  }

  static ensureHasRequiredRole(user: User, role: RoleEnum) {
    if (!user.roles.includes(role)) {
      throw new RequiredRoleMissingError();
    }

    return true;
  }
}
