import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResetPasswordEvent } from '../../domain/events/reset-password.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(email: string) {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (!existingUser) {
      throw new BadRequestException("User not found or doesn't exist");
    }

    this.sendEmail(existingUser);

    return {
      message: 'Password reset link sent!',
    };
  }

  private sendEmail(user: User) {
    const reset_password_token = this.tokenCrypto.signTemporaryToken({
      userId: user.id,
      email: user.email,
    });

    this.eventEmitter.emit(
      'auth.reset.password',
      new ResetPasswordEvent(user.email, reset_password_token),
    );
  }
}
