import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb, DrizzleTx } from '@/core/drizzledb/drizzle.types';
import {
  clientAccounts,
  otps,
  sessions,
  users,
  type ClientAccountRow,
  type UserRow,
} from '@/core/drizzledb/schema';
import { PlatformEnum } from '@/internal/users/enums/Platform.enum';
import { OtpPurposeEnum } from '@/internal/auth/enums/otp-purpose.enum';
import { CompleteClientRegisterDto } from '../dto/client-register.dto';
import { TokenCryptoService } from '../services/token-crypto.service';
import { IAccessTokenPayloadClient } from '@/shared/types/access-token.payload';

@Injectable()
export class CompleteClientEmailRegistrationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: TokenCryptoService,
  ) {}

  async execute(
    dto: CompleteClientRegisterDto,
    ip?: string,
    userAgent?: string,
  ) {
    return this.db.transaction(async (tx) => {
      // 1. Verify and consume OTP
      await this.verifyAndConsumeOtp(tx, dto.email, dto.otp);

      // 2. Ensure user exists and is not already verified
      const user = await this.ensureUserIsNotAlreadyRegistered(tx, dto.email);

      // 3. Mark email verified
      const updatedUser = await this.markEmailVerified(tx, user);

      // 4. Create / setup client account
      const account = await this.createAccount(tx, updatedUser);

      // 5. Generate tokens and session
      const tokens = await this.getTokens(account);

      const session = await this.createSession(
        tx,
        updatedUser.id,
        tokens.refreshToken.hash,
        ip,
        userAgent,
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: `${session.id}.${tokens.refreshToken.raw}`,
      };
    });
  }

  private async verifyAndConsumeOtp(
    tx: DrizzleTx,
    email: string,
    inputOtp: string,
  ) {
    const [otpEntry] = await tx
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

    // On successful verification, delete the OTP entry from auth.otp table
    await tx.delete(otps).where(eq(otps.id, otpEntry.id));
  }

  private async ensureUserIsNotAlreadyRegistered(
    tx: DrizzleTx,
    email: string,
  ): Promise<UserRow> {
    const [existingUser] = await tx
      .select()
      .from(users)
      .where(
        and(eq(users.email, email), eq(users.platform, PlatformEnum.CLIENT)),
      )
      .limit(1);

    if (!existingUser) {
      throw new UnauthorizedException('User not found');
    }

    if (existingUser.email_verified_at) {
      throw new ConflictException('User is already registered');
    }

    return existingUser;
  }

  private async markEmailVerified(
    tx: DrizzleTx,
    user: UserRow,
  ): Promise<UserRow> {
    const emailVerifiedAt = new Date();

    await tx
      .update(users)
      .set({ email_verified_at: emailVerifiedAt })
      .where(eq(users.id, user.id));

    return { ...user, email_verified_at: emailVerifiedAt };
  }

  private async createAccount(
    tx: DrizzleTx,
    user: UserRow,
  ): Promise<ClientAccountRow> {
    const [existingAccount] = await tx
      .select()
      .from(clientAccounts)
      .where(eq(clientAccounts.user_id, user.id))
      .limit(1);

    const firstName = user.first_name;
    const lastName = user.last_name;
    const fullName =
      [firstName, lastName].filter(Boolean).join(' ') ||
      user.full_name ||
      user.name;

    if (existingAccount) {
      const [updated] = await tx
        .update(clientAccounts)
        .set({
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          name: fullName,
        })
        .where(eq(clientAccounts.id, existingAccount.id))
        .returning();

      return updated;
    }

    const [newAccount] = await tx
      .insert(clientAccounts)
      .values({
        user_id: user.id,
        public_id: nanoid(12),
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        name: fullName,
        gender: 'other',
      })
      .returning();

    return newAccount;
  }

  private async getTokens(account: ClientAccountRow) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenCrypto.createAccessToken<IAccessTokenPayloadClient>({
        sub: account.id,
        email: account.email,
      }),
      this.tokenCrypto.createRefreshToken(),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createSession(
    tx: DrizzleTx,
    user_id: number,
    refreshTokenHash: string,
    ip?: string,
    ua?: string,
  ) {
    const [session] = await tx
      .insert(sessions)
      .values({
        user_id,
        ip_address: ip,
        user_agent: ua,
        type: 'refresh_token',
        secret_hash: refreshTokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();

    return session;
  }
}
