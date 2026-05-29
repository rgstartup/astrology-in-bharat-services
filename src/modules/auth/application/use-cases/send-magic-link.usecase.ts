import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { BadRequestException, Injectable } from '@nestjs/common';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { SendMagicLinkEvent } from '../../domain/events/send-magic-link.event';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class SendMagicLinkUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(email: string, roleEnum: RoleEnum) {
    const existingUser = await this.usersFacade.findByEmail(email);

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
