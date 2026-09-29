import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb, DrizzleTx } from '../../../../../core/drizzledb/drizzle.types';
import { users, type UserRow } from '../../../../../core/drizzledb/schema';
import { PlatformEnum } from '../../../../../core/enums';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class InitiateExpertEmailRegistrationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly events: EventEmitter2,
    private readonly tokenCrypto: ExpertTokenCryptoService,
  ) {}

  execute(email: string) {
    return this.db.transaction(async (tx) => {
      const existing = await this.findExpert(tx, email);
      if (existing?.email_verified_at) {
        throw new ConflictException('Expert is already registered');
      }
      const user = existing ?? (await this.createExpert(tx, email));
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

  private async findExpert(
    tx: DrizzleTx,
    email: string,
  ): Promise<UserRow | null> {
    const [user] = await tx
      .select()
      .from(users)
      .where(
        and(eq(users.email, email), eq(users.platform, PlatformEnum.EXPERT)),
      )
      .limit(1);
    return user ?? null;
  }

  private async createExpert(tx: DrizzleTx, email: string): Promise<UserRow> {
    const [user] = await tx
      .insert(users)
      .values({
        email,
        platform: PlatformEnum.EXPERT,
      })
      .returning();
    return user;
  }
}
