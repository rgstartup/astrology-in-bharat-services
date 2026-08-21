import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '@/core/database/database.service';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class InitiateEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
    private readonly tokenCrypto: TokenCryptoService,
  ) { }

  async execute(email: string, role: RoleEnum) {
    let user = await this.userRepository.findOne({ where: { email } });

    if (user) {
      if (user.password || user.name) {
        throw new BadRequestException('User already exists');
      }
      // If user exists but is only half-registered, we can re-send the OTP
    } else {
      user = await this.db.transaction(async (queryRunner) => {
        const newUser = queryRunner.manager.create(User, {
          email,
          role,
          password: undefined,
          name: undefined,
          email_verified_at: undefined,
        });
        return queryRunner.manager.save(User, newUser);
      });
    }

    const verification_token = this.tokenCrypto.signTemporaryToken({
      userId: user.id,
      email: user.email,
    });

    this.eventEmitter.emit(
      'auth.user.registered',
      new UserRegisteredEvent(
        user.id,
        user.email,
        'User',
        user.role,
        verification_token,
      ),
    );

    return { message: 'Verification email sent successfully.' };
  }
}
