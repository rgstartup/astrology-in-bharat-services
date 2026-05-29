import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { VerifyEmailEvent } from '../../domain/events/verify-email.event';
import { EmailVerificationPolicy } from '../../domain/policies/email-verification.policy';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class ResendVerificationEmailUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(email: string, targetRole: RoleEnum) {
    const existingUser = await this.usersFacade.findByEmail(email);

    if (!existingUser) {
      throw new BadRequestException("User not found or doesn't exist");
    }

    EmailVerificationPolicy.canResendVerification(existingUser);

    this.sendEmail(existingUser);

    return {
      message: 'Confirmation email sent!',
    };
  }

  private sendEmail(user: User) {
    const verification_token = this.tokenCrypto.signTemporaryToken({
      userId: user.id,
      email: user.email,
    });

    // Extract role names from user.roles if populated, otherwise use empty array
    const roleNames = user.roles || [];

    this.eventEmitter.emit(
      'auth.email.verify',
      new VerifyEmailEvent(
        user.email,
        verification_token,
        roleNames,
      ),
    );
  }
}
