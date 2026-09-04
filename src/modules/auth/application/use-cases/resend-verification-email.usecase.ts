import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { VerifyEmailEvent } from '../../domain/events/verify-email.event';
import { EmailVerificationPolicy } from '../../domain/policies/email-verification.policy';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ResendVerificationEmailUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(email: string) {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

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

    this.eventEmitter.emit(
      'auth.email.verify',
      new VerifyEmailEvent(user.email, verification_token, user.role),
    );
  }
}
