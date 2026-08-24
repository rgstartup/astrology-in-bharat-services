import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '@/core/database/database.service';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { TokenCryptoService } from '@/modules/auth/infrastructure/tokens/token-crypto.service';
import { ClientRegisteredEvent } from '../../../domain/events/user-registered.event';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';

@Injectable()
export class InitiateClientEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly tokenCrypto: TokenCryptoService,
  ) { }

  async execute(email: string) {
    return this.db.transaction(async (queryRunner) => {
      const existingUser = await this.findClientByEmail(queryRunner, email);

      if (existingUser?.isVerified()) {
        throw new ConflictException('User is already registered');
      }

      const user = existingUser ?? (await this.createUser(queryRunner, email));
      const verificationToken = await this.getVerificationToken(user);

      this.sendEmail(user, verificationToken);

      return { message: 'Verification email sent successfully.' };
    });
  }

  private async findClientByEmail(qr: QueryRunner, email: string): Promise<User | null> {
    const userRepo = qr.manager.getRepository(User);

    return userRepo.findOne({
      where: { email, platform: PlatformEnum.CLIENT },
    });
  }

  private async createUser(qr: QueryRunner, email: string) {
    const newUser = qr.manager.create(User, {
      email,
      platform: PlatformEnum.CLIENT,
    });

    return qr.manager.save(User, newUser);
  }

  private async getVerificationToken(user: User) {
    return this.tokenCrypto.signTemporaryToken({
      userId: user.id,
      email: user.email,
    });
  }

  private sendEmail(user: User, verification_token: string) {
    this.eventEmitter.emit(
      'auth.client.registered',
      new ClientRegisteredEvent(
        user.id,
        user.email,
        'client',
        verification_token,
      ),
    );
  }
}
