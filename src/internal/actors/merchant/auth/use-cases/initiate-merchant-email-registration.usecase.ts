import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { users } from '@/core/drizzledb/schema';
import { PlatformEnum } from '@/core/enums';
import { MerchantTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class InitiateMerchantEmailRegistrationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly events: EventEmitter2,
    private readonly tokenCrypto: MerchantTokenCryptoService,
  ) {}

  execute(email: string) {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.users.findFirst({
        where: and(
          eq(users.email, email),
          eq(users.platform, PlatformEnum.MERCHANT),
        ),
      });

      if (existing?.email_verified_at) {
        throw new ConflictException('Merchant is already registered');
      }

      let user = existing;
      if (!user) {
        const [inserted] = await tx
          .insert(users)
          .values({ email, platform: PlatformEnum.MERCHANT })
          .returning();
        user = inserted;
      }

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
}

