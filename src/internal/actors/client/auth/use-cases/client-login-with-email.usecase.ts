import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { and, desc, eq } from "drizzle-orm";
import { createHash, randomInt } from "crypto";
import { nanoid } from "nanoid";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import {
  clientAccounts,
  otps,
  sessions,
  users,
  type ClientAccountRow,
} from "@/core/drizzledb/schema";
import { PlatformEnum } from "@/internal/users/enums/Platform.enum";
import { RoleEnum } from "@/internal/users/enums/Role.enum";
import { OtpPurposeEnum } from "@/internal/auth/enums/otp-purpose.enum";
import { ClientLoginDto } from "../dto/client-login.dto";
import { type IHasher, IHasherToken } from "@/shared/contracts/hasher.contract";
import { IAccessTokenPayloadClient } from "@/shared/types/access-token.payload";
import { TokenCryptoService } from "../services/token-crypto.service";

type LoginUserRow = {
  id: number;
  email: string;
  password: string | null;
  email_verified_at: Date | null;
  is_blocked: boolean;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  full_name: string | null;
};

@Injectable()
export class ClientLoginWithEmailUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(IHasherToken)
    private readonly hasher: IHasher,
  ) {}

  async execute(dto: ClientLoginDto, ip?: string, userAgent?: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        email_verified_at: users.email_verified_at,
        is_blocked: users.is_blocked,
        first_name: users.first_name,
        last_name: users.last_name,
        name: users.name,
        full_name: users.full_name,
      })
      .from(users)
      .where(
        and(
          eq(users.email, dto.email),
          eq(users.platform, PlatformEnum.CLIENT),
        ),
      )
      .limit(1);

    const isValidPassword = await this.verifyPassword(
      user?.password ?? null,
      dto.password,
    );

    if (!user || !user.password || !isValidPassword) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!user.email_verified_at) {
      if (!dto.otp) {
        await this.sendVerificationOtp(user);
        throw new ConflictException(
          "Please verify your email first. A new OTP has been sent to your email.",
        );
      }

      await this.verifyRegistrationOtp(user, dto.otp);
      await this.db
        .update(users)
        .set({ email_verified_at: new Date() })
        .where(eq(users.id, user.id));
    }

    let account = await this.findAccountByUserId(user.id);

    if (!account) {
      account = await this.createAccount(user);
    }

    if (account.is_blocked || user.is_blocked) {
      throw new ForbiddenException("Your account has been suspended");
    }

    const tokens = await this.getTokens(account);

    const session = await this.createSession(
      user.id,
      tokens.refreshToken.hash,
      ip,
      userAgent,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: `${session.id}.${tokens.refreshToken.raw}`,
    };
  }

  private async findAccountByUserId(
    user_id: number,
  ): Promise<ClientAccountRow | null> {
    const [account] = await this.db
      .select()
      .from(clientAccounts)
      .where(eq(clientAccounts.user_id, user_id))
      .limit(1);

    return account ?? null;
  }

  private async createAccount(user: LoginUserRow): Promise<ClientAccountRow> {
    const firstName = user.first_name;
    const lastName = user.last_name;
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") ||
      user.full_name ||
      user.name;

    const [account] = await this.db
      .insert(clientAccounts)
      .values({
        user_id: user.id,
        public_id: nanoid(12),
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        name: fullName,
      })
      .returning();

    return account;
  }

  private async sendVerificationOtp(user: LoginUserRow) {
    // Remove previous OTP for this email with purpose: REGISTRATION
    await this.db
      .delete(otps)
      .where(
        and(
          eq(otps.email, user.email),
          eq(otps.purpose, OtpPurposeEnum.REGISTRATION),
        ),
      );

    const otp = randomInt(100000, 1000000).toString();
    const hashedOtp = createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.db.insert(otps).values({
      email: user.email,
      user_id: user.id,
      otp: hashedOtp,
      purpose: OtpPurposeEnum.REGISTRATION,
      attempts: 0,
      expires_at: expiresAt,
    });

    this.eventEmitter.emit("auth.client.registered", {
      userId: user.id,
      email: user.email,
      name: user.full_name || undefined,
      role: RoleEnum.CLIENT,
      otp,
    });
  }

  private async verifyRegistrationOtp(user: LoginUserRow, inputOtp: string) {
    const [otpEntry] = await this.db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.email, user.email),
          eq(otps.purpose, OtpPurposeEnum.REGISTRATION),
        ),
      )
      .orderBy(desc(otps.created_at))
      .limit(1);

    if (!otpEntry) {
      throw new BadRequestException("Invalid or expired OTP");
    }

    if (new Date() > otpEntry.expires_at) {
      await this.db.delete(otps).where(eq(otps.id, otpEntry.id));
      throw new BadRequestException(
        "OTP has expired. Please request a new OTP.",
      );
    }

    if (otpEntry.attempts >= 5) {
      await this.db.delete(otps).where(eq(otps.id, otpEntry.id));
      throw new BadRequestException(
        "Maximum verification attempts exceeded. Please request a new OTP.",
      );
    }

    const hashedInputOtp = createHash("sha256").update(inputOtp).digest("hex");

    if (hashedInputOtp !== otpEntry.otp) {
      await this.db
        .update(otps)
        .set({ attempts: otpEntry.attempts + 1 })
        .where(eq(otps.id, otpEntry.id));
      throw new BadRequestException("Invalid OTP");
    }

    await this.db.delete(otps).where(eq(otps.id, otpEntry.id));
  }

  private async verifyPassword(
    passwordHash: string | null,
    password: string,
  ): Promise<boolean> {
    const FALLBACK_PASSWORD = await this.hasher.hash("fallbackInvalidPassword");

    const isValid = await this.hasher.verify(
      passwordHash ?? FALLBACK_PASSWORD,
      password,
    );

    return isValid;
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
    user_id: number,
    refreshTokenHash: string,
    ip?: string,
    ua?: string,
  ) {
    const [session] = await this.db
      .insert(sessions)
      .values({
        user_id,
        ip_address: ip,
        user_agent: ua,
        type: "refresh_token",
        secret_hash: refreshTokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: sessions.id });

    return session;
  }
}
