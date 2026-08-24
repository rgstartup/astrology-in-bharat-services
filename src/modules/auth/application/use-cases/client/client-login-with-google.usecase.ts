import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Profile } from 'passport-google-oauth20';
import { DatabaseService } from '@/core/database/database.service';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { TokenCryptoService } from '@/modules/auth/infrastructure/tokens/token-crypto.service';
import { IAccessTokenPayloadClient } from '@/common/types/access-token.payload';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { ClientOAuthDto } from '@/modules/auth/api/dto/client/client-oauth-user.dto';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import { OAuthAccount } from '@/modules/auth/infrastructure/entities/oauth-accounts.entity';

@Injectable()
export class ClientLoginWithGoogleUseCase {
  private readonly logger = new Logger(ClientLoginWithGoogleUseCase.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly tokenCrypto: TokenCryptoService,
  ) { }

  async execute(input: {
    providerId: string;
    email: string;
    name?: string;
    oauthProfile?: Profile;

  }, ip?: string, userAgent?: string) {

    return this.db.transaction(async (qr) => {

      const user = await this.findOrCreateClientFromOAuth(
        {
          provider: 'google',
          provider_id: input.providerId,
          email: input.email,
          full_name: input.name,
          oauthProfile: input.oauthProfile,
        },
        qr,
      );

      const profile = await this.findOrCreateProfile(user, qr);

      if (!profile) {
        throw new InternalServerErrorException("Error while creating profile")
      }

      // generate access token and refresh token 
      const { refreshTokenHash, refreshTokenRaw, accessToken } = await this.getTokens(user, profile.id);

      // save session
      const session = await this.createSession(qr, user, refreshTokenHash, ip, userAgent);

      return {
        user,
        tokens: {
          accessToken,
          refreshToken: `${session.id}.${refreshTokenRaw}`,
        }
      };
    });
  }

  async findOrCreateClientFromOAuth(
    dto: ClientOAuthDto,
    queryRunner: QueryRunner,
  ): Promise<User> {
    // 1. Find existing user by OAuth account
    const oauthAccountRepo = queryRunner.manager.getRepository(OAuthAccount);

    const existingOAuthAccount = await oauthAccountRepo.findOne({
      where: { provider: dto.provider, provider_id: dto.provider_id },
      relations: ['user'],
    });

    if (existingOAuthAccount?.user) return existingOAuthAccount.user;

    // 2. Find existing user by email or create new
    const userRepo = queryRunner.manager.getRepository(User);

    let user = dto.email
      ? await userRepo.findOne({ where: { email: dto.email } })
      : null;

    if (!user) {
      const newUser = userRepo.create({
        email: dto.email,
        full_name: dto.full_name,
        avatar:
          dto.oauthProfile?.photos?.[0]?.value ||
          dto.oauthProfile?.profileUrl,
      });

      newUser.markEmailAsVerified();
      user = await userRepo.save(newUser);
    }

    // 3. Link OAuth Account to the persisted user
    const account = oauthAccountRepo.create({
      provider: dto.provider,
      provider_id: dto.provider_id,
      email: dto.email,
      user,
    });
    await oauthAccountRepo.save(account);

    return user;
  }

  private async findOrCreateProfile(user: User, queryRunner: QueryRunner) {
    const profileClientRepo = queryRunner.manager.getRepository(ProfileClient);

    const existingProfile = await profileClientRepo.findOne({ where: { user: { id: user.id, platform: PlatformEnum.CLIENT } } });

    if (existingProfile) return existingProfile;

    const newClientProfile = profileClientRepo.create({
      user: {
        id: user.id
      },
      name: user.full_name,
      avatar: user.avatar,
      email: user.email
    })

    return profileClientRepo.save(newClientProfile);
  }

  private async getTokens(user: User, profileId?: string) {
    const accessToken = await this.tokenCrypto.createAccessToken<IAccessTokenPayloadClient>({
      sub: user.id,
      email: user.email,
      profile: profileId,
    })

    const { raw, hash } = await this.tokenCrypto.createRefreshToken();

    return {
      accessToken,
      refreshTokenRaw: raw,
      refreshTokenHash: hash
    }
  }

  private async createSession(queryRunner: QueryRunner, user: User, refreshTokenhash: string, ip?: string, ua?: string) {
    const sessionRepo = queryRunner.manager.getRepository(Session)

    const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
    const newSession = sessionRepo.create(
      {
        user,
        ip_address: ip,
        user_agent: ua,
        type: 'refresh_token',
        secret_hash: refreshTokenhash,
        expires_at: new Date(Date.now() + SEVEN_DAYS_IN_MS),
      })
    return sessionRepo.save(newSession)
  }
}