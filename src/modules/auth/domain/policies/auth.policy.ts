import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { EmailNotVerifiedError } from '../errors/email-not-verified.error';

export class AuthPolicy {
  static ensureCanLogin(user: User) {
    if (!user.email_verified_at) {
      throw new EmailNotVerifiedError();
    }
  }
}
