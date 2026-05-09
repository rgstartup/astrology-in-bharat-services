import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { EmailAlreadyVerifiedError } from '../errors/email-already-verified.error';
import { TokenAlreadyUsedError } from '../errors/token-already-used.error';

export class EmailVerificationPolicy {
  static ensureEmailNotVerified(user: User) {
    if (user.email_verified_at) {
      throw new EmailAlreadyVerifiedError();
    }
  }

  static ensureTokenNotUsed(isTokenUsed: boolean) {
    if (isTokenUsed) {
      throw new TokenAlreadyUsedError();
    }
  }

  static canResendVerification(user: User) {
    if (user.email_verified_at) {
      throw new EmailAlreadyVerifiedError();
    }
  }
}
