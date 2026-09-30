import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import type { Profile } from 'passport-google-oauth20';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type {
  DrizzleDb,
  DrizzleTx,
} from '@/core/drizzledb/drizzle.types';
import {
  expertAccounts,
  media,
  oauthAccounts,
  sessions,
  users,
  type ExpertAccountRow,
  type UserRow,
} from '@/core/drizzledb/schema';
import { MediaSource, PlatformEnum, RoleEnum } from '@/core/enums';
import { ExpertKycStatus } from '@/internal/actors/expert/shared/enums/kyc-status.enum';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';
import { ExpertOAuthDto } from '../dto/expert-oauth-user.dto';

@Injectable()
export class ExpertLoginWithGoogleUseCase {
  private readonly logger = new Logger(ExpertLoginWithGoogleUseCase.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: ExpertTokenCryptoService,
  ) {}

  async execute(
    input: {
      providerId: string;
      email: string;
      name?: string;
      oauthProfile?: Profile;
    },
    ip?: string,
    userAgent?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const user = await this.findOrCreateExpertFromOAuth(
        new ExpertOAuthDto({
          provider: 'google',
          provider_id: input.providerId,
          email: input.email,
          full_name: input.name,
          oauthProfile: input.oauthProfile,
        }),
        tx,
      );

      const account = await this.findOrCreateAccount(user, tx);

      if (account.is_blocked || user.is_blocked) {
        throw new ForbiddenException('Your account has been suspended');
      }

      const { refreshTokenHash, refreshTokenRaw, accessToken } =
        await this.getTokens(account);

      const session = await this.createSession(
        tx,
        user.id,
        refreshTokenHash,
        ip,
        userAgent,
      );

      return {
        accessToken,
        refreshToken: `${session.id}.${refreshTokenRaw}`,
      };
    });
  }

  async findOrCreateExpertFromOAuth(
    dto: ExpertOAuthDto,
    tx: DrizzleTx,
  ): Promise<UserRow> {
    const [existingOAuthAccount] = await tx
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, dto.provider),
          eq(oauthAccounts.provider_id, dto.provider_id),
        ),
      )
      .limit(1);

    if (existingOAuthAccount) {
      const [linkedUser] = await tx
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, existingOAuthAccount.user_id),
            eq(users.platform, PlatformEnum.EXPERT),
          ),
        )
        .limit(1);

      if (linkedUser) return linkedUser;
    }

    let user: UserRow | null = null;
    if (dto.email) {
      const [byEmail] = await tx
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, dto.email),
            eq(users.platform, PlatformEnum.EXPERT),
          ),
        )
        .limit(1);
      user = byEmail ?? null;
    }

    if (!user) {
      const avatarUrl =
        dto.oauthProfile?.photos?.[0]?.value || dto.oauthProfile?.profileUrl;
      let avatarMediaId: number | null = null;

      if (avatarUrl) {
        const [savedMedia] = await tx
          .insert(media)
          .values({
            url: avatarUrl,
            source: MediaSource.GOOGLE,
            public_id: null,
            mime_type: 'image/jpeg',
          })
          .returning({ id: media.id });
        avatarMediaId = savedMedia.id;
      }

      const [newUser] = await tx
        .insert(users)
        .values({
          email: dto.email,
          full_name: dto.full_name,
          name: dto.full_name,
          avatar: avatarUrl,
          avatar_id: avatarMediaId,
          email_verified_at: new Date(),
          platform: PlatformEnum.EXPERT,
          role: RoleEnum.EXPERT,
        })
        .returning();
      user = newUser;
    }

    if (!existingOAuthAccount) {
      await tx.insert(oauthAccounts).values({
        provider: dto.provider,
        provider_id: dto.provider_id,
        email: dto.email,
        user_id: user.id,
      });
    }

    return user;
  }

  private async findOrCreateAccount(
    user: UserRow,
    tx: DrizzleTx,
  ): Promise<ExpertAccountRow> {
    const [existingAccount] = await tx
      .select()
      .from(expertAccounts)
      .where(eq(expertAccounts.user_id, user.id))
      .limit(1);

    if (existingAccount) return existingAccount;

    const [newAccount] = await tx
      .insert(expertAccounts)
      .values({
        user_id: user.id,
        name: user.full_name || user.name,
        email: user.email,
        avatar: user.avatar,
        gender: 'other',
        experience_in_years: 0,
        kyc_status: ExpertKycStatus.PENDING,
      })
      .returning();

    return newAccount;
  }

  private async getTokens(account: ExpertAccountRow) {
    const accessToken = await this.tokenCrypto.createAccessToken({
      sub: account.id,
      email: account.email || '',
    });

    const { raw, hash } = await this.tokenCrypto.createRefreshToken();

    return {
      accessToken,
      refreshTokenRaw: raw,
      refreshTokenHash: hash,
    };
  }

  private async createSession(
    tx: DrizzleTx,
    user_id: number,
    refreshTokenHash: string,
    ip?: string,
    ua?: string,
  ) {
    const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
    const [session] = await tx
      .insert(sessions)
      .values({
        user_id,
        ip_address: ip,
        user_agent: ua,
        type: 'refresh_token',
        secret_hash: refreshTokenHash,
        expires_at: new Date(Date.now() + SEVEN_DAYS_IN_MS),
      })
      .returning();

    return session;
  }
}
