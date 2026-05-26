// @ts-nocheck
import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '@/core/database/database.service';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class InitiateEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersFacade: UsersFacade,
    private readonly eventEmitter: EventEmitter2,
    private readonly tokenCrypto: TokenCryptoService,
  ) {}

  async execute(email: string, role?: string) {
    let user = await this.usersFacade.findByEmail(email);
    
    let requestedRole = RoleEnum.CLIENT;
    if (role?.toLowerCase() === 'expert') requestedRole = RoleEnum.EXPERT;
    else if (role?.toLowerCase() === 'agent') requestedRole = RoleEnum.AGENT;
    else if (role?.toLowerCase() === 'merchant') requestedRole = RoleEnum.MERCHANT;

    if (user) {
      if (user.password || user.name) {
        throw new BadRequestException('User already exists');
      }
      // If user exists but is only half-registered, we can re-send the OTP
    } else {
      user = await this.db.transaction(async (queryRunner) => {
        return this.usersFacade.create(
          {
            email,
            roles: [requestedRole],
            password: null,
            name: null,
            email_verified_at: undefined,
          },
          queryRunner,
        );
      });
    }

    const verification_token = this.tokenCrypto.signTemporaryToken({
      userId: user.id,
      email: user.email,
    });

    // We can reuse the UserRegisteredEvent to send the verification email
    // or create a new event. The email service probably listens to auth.user.registered
    this.eventEmitter.emit(
      'auth.user.registered',
      new UserRegisteredEvent(
        user.id,
        user.email,
        'User', // Default name for the email template
        verification_token,
        user.roles,
      ),
    );

    return { message: 'Verification email sent successfully.' };
  }
}
