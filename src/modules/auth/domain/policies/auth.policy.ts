import { User } from '@/modules/users/infrastructure/entities/user.entity';
import {
  EmailNotVerifiedError,
  RequiredRoleMissingError,
} from '../errors/email-not-verified.error';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AuthPolicy {
  constructor(@Inject(IHasherToken) private readonly passwordHasher: IHasher) {}

  ensureEmailVerified(user: User) {
    if (!user.email_verified_at) {
      throw new EmailNotVerifiedError();
    }

    return true;
  }

  ensureHasRequiredRole(user: User, role: RoleEnum) {
    if (!user.roles.includes(role)) {
      throw new RequiredRoleMissingError();
    }

    return true;
  }

  async verifyPassword(user: User | null, password: string): Promise<boolean> {
    const FALLBACK_PASSWORD = await this.passwordHasher.hash(
      'fallbackInvalidPassword',
    );

    const isValid = await this.passwordHasher.verify(
      user?.password ?? FALLBACK_PASSWORD,
      password,
    );

    return isValid;
  }
}
