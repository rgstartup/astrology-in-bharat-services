import { ConflictException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryRunner } from 'typeorm';
import { DatabaseService } from '@/core/database/database.service';
import { User } from '@/modules/users/entities/user.entity';
import { PlatformEnum } from '@/modules/users/enums/Platform.enum';
import { MerchantTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class InitiateMerchantEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly events: EventEmitter2,
    private readonly tokenCrypto: MerchantTokenCryptoService,
  ) {}

  execute(email: string) {
    return this.db.transaction(async (qr) => {
      const existing = await this.findMerchant(qr, email);
      if (existing?.isVerified()) {
        throw new ConflictException('Merchant is already registered');
      }

      const user = existing ?? (await this.createMerchant(qr, email));

      const verificationToken = this.tokenCrypto.signTemporaryToken({
        userId: user.id,
        email: user.email,
        platform: PlatformEnum.MERCHANT,
      });

      this.events.emit('auth.merchant.registered', {
        email: user.email,
        name: user.full_name || undefined,
        verification_token: verificationToken,
      });
      return { message: 'Verification email sent successfully.' };
    });
  }

  private findMerchant(qr: QueryRunner, email: string) {
    return qr.manager.findOne(User, {
      where: { email, platform: PlatformEnum.MERCHANT },
    });
  }

  private createMerchant(qr: QueryRunner, email: string) {
    return qr.manager.save(
      User,
      qr.manager.create(User, { email, platform: PlatformEnum.MERCHANT }),
    );
  }
}
