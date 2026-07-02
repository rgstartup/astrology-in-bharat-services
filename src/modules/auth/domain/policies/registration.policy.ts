import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { EmailAlreadyExistsError } from '../errors/email-already-exists.error';

export class RegistrationPolicy {
  static ensureEmailIsUnique(existingUser: User | null) {
    if (existingUser) {
      throw new EmailAlreadyExistsError();
    }
  }
}
