import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, Injectable } from '@nestjs/common';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { SendMagicLinkEvent } from '../../domain/events/send-magic-link.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class SendMagicLinkUseCase {
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

    const token = this.tokenCrypto.signTemporaryToken({
      userId: existingUser.id,
      email: existingUser.email,
    });

    this.eventEmitter.emit(
      'auth.magic.link',
      new SendMagicLinkEvent(existingUser.email, token),
    );

    return {
      message: 'Magic link sent successfully!',
    };
  }
}
