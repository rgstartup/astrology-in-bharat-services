import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomInt } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  expertAccounts,
  otps,
  sessions,
  users,
} from '@/core/drizzledb/schema';
import { OtpPurposeEnum, PlatformEnum, RoleEnum } from '@/core/enums';
import { type IHasher, IHasherToken } from '@/shared/contracts/hasher.contract';
import { ExpertLoginDto } from '../dto/expert-login.dto';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';

type LoginRow = {
  expert_id: number;
  expert_email: string | null;
  expert_is_blocked: boolean;
  user_id: number;
  user_email: string;
  user_password: string | null;
  user_email_verified_at: Date | null;
  user_is_blocked: boolean;
  user_full_name: string | null;
};

@Injectable()
export class ExpertLoginWithEmailUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: ExpertTokenCryptoService,
    private readonly events: EventEmitter2,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(dto: ExpertLoginDto, ip?: string, userAgent?: string) {
    const [row] = await this.db
      .select({
        expert_id: expertAccounts.id,
        expert_email: expertAccounts.email,
        expert_is_blocked: expertAccounts.is_blocked,
        user_id: users.id,
        user_email: users.email,
        user_password: users.password,
        user_email_verified_at: users.email_verified_at,
        user_is_blocked: users.is_blocked,
        user_full_name: users.full_name,
      })
      .from(expertAccounts)
      .innerJoin(users, eq(users.id, expertAccounts.user_id))
      .where(
        and(
          eq(users.email, dto.email),
          eq(users.platform, PlatformEnum.EXPERT),
        ),
      )
      .limit(1);

    const fallback = await this.hasher.hash('fallbackInvalidPassword');
    const valid = await this.hasher.verify(
      row?.user_password ?? fallback,
      dto.password,
    );
    if (!row?.user_password || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!row.user_email_verified_at) {
      if (!dto.otp) {
        await this.sendVerificationOtp(row);
        throw new ConflictException(
          'Please verify your email first. A new OTP has been sent to your email.',
        );
      }
      await this.verifyAndConsumeOtp(row.user_email, dto.otp);
      await this.markEmailVerified(row.user_id);
    }
    if (row.expert_is_blocked || row.user_is_blocked) {
      throw new ForbiddenException('Your account has been suspended');
    }
    return this.issueSession(
      row.expert_id,
      row.expert_email ?? row.user_email,
      row.user_id,
      ip,
      userAgent,
    );
  }

  private async sendVerificationOtp(row: LoginRow) {
    await this.db
      .delete(otps)
      .where(
        and(
          eq(otps.email, row.user_email),
          eq(otps.purpose, OtpPurposeEnum.REGISTRATION),
        ),
      );

    const otp = randomInt(100000, 1000000).toString();
    const hashedOtp = createHash('sha256').update(otp).digest('hex');

    await this.db.insert(otps).values({
      email: row.user_email,
      user_id: row.user_id,
      otp: hashedOtp,
      purpose: OtpPurposeEnum.REGISTRATION,
      attempts: 0,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    this.events.emit('auth.expert.registered', {
      userId: row.user_id,
      email: row.user_email,
      name: row.user_full_name || undefined,
      role: RoleEnum.EXPERT,
      otp,
    });
  }

  private async verifyAndConsumeOtp(email: string, inputOtp: string) {
    const [otpEntry] = await this.db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.email, email),
          eq(otps.purpose, OtpPurposeEnum.REGISTRATION),
        ),
      )
      .orderBy(desc(otps.created_at))
      .limit(1);

    if (!otpEntry) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (new Date() > otpEntry.expires_at) {
      await this.db.delete(otps).where(eq(otps.id, otpEntry.id));
      throw new BadRequestException(
        'OTP has expired. Please request a new OTP.',
      );
    }

    if (otpEntry.attempts >= 5) {
      await this.db.delete(otps).where(eq(otps.id, otpEntry.id));
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    const hashedInputOtp = createHash('sha256').update(inputOtp).digest('hex');

    if (hashedInputOtp !== otpEntry.otp) {
      await this.db
        .update(otps)
        .set({ attempts: otpEntry.attempts + 1 })
        .where(eq(otps.id, otpEntry.id));
      throw new BadRequestException('Invalid OTP');
    }

    await this.db.delete(otps).where(eq(otps.id, otpEntry.id));
  }

  private async markEmailVerified(userId: number) {
    await this.db
      .update(users)
      .set({ email_verified_at: new Date(), updated_at: new Date() })
      .where(eq(users.id, userId));
  }

  private async issueSession(
    expertId: number,
    expertEmail: string,
    userId: number,
    ip?: string,
    userAgent?: string,
  ) {
    const [accessToken, refresh] = await Promise.all([
      this.tokenCrypto.createAccessToken({
        sub: expertId,
        email: expertEmail,
      }),
      this.tokenCrypto.createRefreshToken(),
    ]);
    const [session] = await this.db
      .insert(sessions)
      .values({
        user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        type: 'refresh_token',
        secret_hash: refresh.hash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: sessions.id });

    return { accessToken, refreshToken: `${session.id}.${refresh.raw}` };
  }
}
