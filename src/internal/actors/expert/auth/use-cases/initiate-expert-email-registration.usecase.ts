import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomInt } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb, DrizzleTx } from '@/core/drizzledb/drizzle.types';
import { otps, users, type UserRow } from '@/core/drizzledb/schema';
import { OtpPurposeEnum, PlatformEnum, RoleEnum } from '@/core/enums';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';

@Injectable()
export class InitiateExpertEmailRegistrationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly events: EventEmitter2,
  ) {}

  execute(email: string) {
    return this.db.transaction(async (tx) => {
      const existing = await this.findExpert(tx, email);

      if (existing?.email_verified_at) {
        throw new ConflictException('Expert is already registered');
      }

      const user = existing ?? (await this.createExpert(tx, email));
      const otp = this.generateOtp();
      await this.saveOtp(tx, user.email, user.id, this.hashOtp(otp));
      this.sendEmail(user, otp);
      return new BooleanMessage(true, 'OTP sent successfully to your email.');
    });
  }

  private async findExpert(
    tx: DrizzleTx,
    email: string,
  ): Promise<UserRow | null> {
    const [user] = await tx
      .select({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        email_verified_at: users.email_verified_at,
      })
      .from(users)
      .where(
        and(eq(users.email, email), eq(users.platform, PlatformEnum.EXPERT)),
      )
      .limit(1);

    if (!user) return null;
    return user as UserRow;
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

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private async saveOtp(
    tx: DrizzleTx,
    email: string,
    userId: number,
    hashedOtp: string,
  ) {
    await tx
      .delete(otps)
      .where(
        and(
          eq(otps.email, email),
          eq(otps.purpose, OtpPurposeEnum.REGISTRATION),
        ),
      );

    const [otp] = await tx
      .insert(otps)
      .values({
        email,
        user_id: userId,
        otp: hashedOtp,
        purpose: OtpPurposeEnum.REGISTRATION,
        attempts: 0,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
      })
      .returning();

    return otp;
  }

  private sendEmail(user: UserRow, otp: string) {
    this.events.emit('auth.expert.registered', {
      userId: user.id,
      email: user.email,
      name: user.full_name || undefined,
      role: RoleEnum.EXPERT,
      otp,
    });
  }
}
