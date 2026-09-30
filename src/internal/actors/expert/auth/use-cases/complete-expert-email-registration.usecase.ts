import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb, DrizzleTx } from '@/core/drizzledb/drizzle.types';
import {
  expertAccounts,
  otps,
  sessions,
  users,
  type ExpertAccountRow,
  type UserRow,
} from '@/core/drizzledb/schema';
import { OtpPurposeEnum, PlatformEnum } from '@/core/enums';
import { type IHasher, IHasherToken } from '@/shared/contracts/hasher.contract';
import { CompleteExpertRegisterDto } from '../dto/expert-register.dto';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class CompleteExpertEmailRegistrationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: ExpertTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(
    dto: CompleteExpertRegisterDto,
    ip?: string,
    userAgent?: string,
  ) {
    return this.db.transaction(async (tx) => {
      await this.verifyAndConsumeOtp(tx, dto.email, dto.otp);
      const user = await this.getPendingExpert(tx, dto.email);
      const hashedPassword = await this.hasher.hash(dto.password);
      const emailVerifiedAt = new Date();

      await tx
        .update(users)
        .set({
          full_name: dto.name,
          name: dto.name,
          password: hashedPassword,
          email_verified_at: emailVerifiedAt,
          updated_at: new Date(),
        })
        .where(eq(users.id, user.id));

      const updatedUser: UserRow = {
        ...user,
        full_name: dto.name,
        name: dto.name,
        password: hashedPassword,
        email_verified_at: emailVerifiedAt,
      };

      const account = await this.createOrUpdateAccount(tx, updatedUser, dto);
      const [accessToken, refresh] = await Promise.all([
        this.tokenCrypto.createAccessToken({
          sub: account.id,
          email: account.email,
        }),
        this.tokenCrypto.createRefreshToken(),
      ]);

      const [session] = await tx
        .insert(sessions)
        .values({
          user_id: user.id,
          ip_address: ip,
          user_agent: userAgent,
          type: 'refresh_token',
          secret_hash: refresh.hash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: sessions.id });

      return { accessToken, refreshToken: `${session.id}.${refresh.raw}` };
    });
  }

  private async verifyAndConsumeOtp(
    tx: DrizzleTx,
    email: string,
    inputOtp: string,
  ) {
    const [otpEntry] = await tx
      .select({
        id: otps.id,
        attempts: otps.attempts,
        expires_at: otps.expires_at,
        otp: otps.otp,
      })
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
      await tx.delete(otps).where(eq(otps.id, otpEntry.id));
      throw new BadRequestException(
        'OTP has expired. Please request a new OTP.',
      );
    }

    if (otpEntry.attempts >= 5) {
      await tx.delete(otps).where(eq(otps.id, otpEntry.id));
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    const hashedInputOtp = createHash('sha256').update(inputOtp).digest('hex');

    if (hashedInputOtp !== otpEntry.otp) {
      await tx
        .update(otps)
        .set({ attempts: otpEntry.attempts + 1 })
        .where(eq(otps.id, otpEntry.id));
      throw new BadRequestException('Invalid OTP');
    }

    await tx.delete(otps).where(eq(otps.id, otpEntry.id));
  }

  private async getPendingExpert(
    tx: DrizzleTx,
    email: string,
  ): Promise<UserRow> {
    const [user] = await tx
      .select()
      .from(users)
      .where(
        and(eq(users.email, email), eq(users.platform, PlatformEnum.EXPERT)),
      )
      .limit(1);

    if (!user) throw new UnauthorizedException('Expert not found');
    if (user.email_verified_at) {
      throw new ConflictException('Expert is already registered');
    }
    return user;
  }

  private async createOrUpdateAccount(
    tx: DrizzleTx,
    user: UserRow,
    dto: CompleteExpertRegisterDto,
  ): Promise<ExpertAccountRow> {
    const [existingAccount] = await tx
      .select()
      .from(expertAccounts)
      .where(eq(expertAccounts.user_id, user.id))
      .limit(1);

    if (existingAccount) {
      const [updated] = await tx
        .update(expertAccounts)
        .set({
          name: dto.name,
          email: user.email,
          avatar: user.avatar,
          phone: dto.phone ?? existingAccount.phone,
          gender: dto.gender ?? existingAccount.gender,
          specialization: dto.specialization ?? existingAccount.specialization,
          languages: dto.languages ?? existingAccount.languages,
          experience_in_years:
            dto.experience_in_years ?? existingAccount.experience_in_years,
          about_me: dto.aboutMe ?? existingAccount.about_me,
          updated_at: new Date(),
        })
        .where(eq(expertAccounts.id, existingAccount.id))
        .returning({ id: expertAccounts.id, email: expertAccounts.email });
      return updated as ExpertAccountRow;
    }

    const [created] = await tx
      .insert(expertAccounts)
      .values({
        user_id: user.id,
        name: dto.name,
        email: user.email,
        avatar: user.avatar,
        phone: dto.phone,
        gender: dto.gender ?? 'other',
        specialization: dto.specialization,
        languages: dto.languages,
        experience_in_years: dto.experience_in_years ?? 0,
        about_me: dto.aboutMe,
      })
      .returning({ id: expertAccounts.id, email: expertAccounts.email });
    return created as ExpertAccountRow;
  }
}
