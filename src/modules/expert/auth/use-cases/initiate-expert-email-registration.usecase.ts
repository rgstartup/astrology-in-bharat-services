import { ConflictException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryRunner } from 'typeorm';
import { DatabaseService } from '@/core/database/database.service';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class InitiateExpertEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly events: EventEmitter2,
    private readonly tokenCrypto: ExpertTokenCryptoService,
  ) {}

  execute(email: string) {
    return this.db.transaction(async (qr) => {
      const existing = await this.findExpert(qr, email);
      if (existing?.isVerified()) {
        throw new ConflictException('Expert is already registered');
      }
      const user = existing ?? (await this.createExpert(qr, email));
      const verificationToken = this.tokenCrypto.signTemporaryToken({
        userId: user.id,
        email: user.email,
        platform: PlatformEnum.EXPERT,
      });
      this.events.emit('auth.expert.registered', {
        email: user.email,
        name: user.full_name || undefined,
        verification_token: verificationToken,
      });
      return { message: 'Verification email sent successfully.' };
    });
  }

  private findExpert(qr: QueryRunner, email: string) {
    return qr.manager.findOne(User, {
      where: { email, platform: PlatformEnum.EXPERT },
    });
  }

  private createExpert(qr: QueryRunner, email: string) {
    return qr.manager.save(
      User,
      qr.manager.create(User, { email, platform: PlatformEnum.EXPERT }),
    );
  }
}
