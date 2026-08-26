import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Profile } from 'passport-google-oauth20';
import { DatabaseService } from '@/core/database/database.service';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { TokenCryptoService } from '../services/token-crypto.service';
import { IAccessTokenPayloadClient } from '@/common/types/access-token.payload';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { ClientOAuthDto } from '../dto/client-oauth-user.dto';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { OAuthAccount } from '@/modules/auth/infrastructure/entities/oauth-accounts.entity';
import crypto from 'node:crypto';

@Injectable()
export class ClientLoginWithGoogleUseCase {
  private readonly logger = new Logger(ClientLoginWithGoogleUseCase.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly tokenCrypto: TokenCryptoService,
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

      const account = await this.findOrCreateAccount(user, qr);

      if (!account) {
        throw new InternalServerErrorException('Error while creating client account');
      }

      if (account.is_blocked || user.is_blocked) {
        throw new ForbiddenException('Your account has been suspended');
      }

      const { refreshTokenHash, refreshTokenRaw, accessToken } =
        await this.getTokens(account);

      const session = await this.createSession(
        qr,
        user,
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

  async findOrCreateClientFromOAuth(
    dto: ClientOAuthDto,
    queryRunner: QueryRunner,
  ): Promise<User> {
    const oauthAccountRepo = queryRunner.manager.getRepository(OAuthAccount);

    const existingOAuthAccount = await oauthAccountRepo.findOne({
      where: { provider: dto.provider, provider_id: dto.provider_id },
      relations: ['user'],
    });

    if (existingOAuthAccount?.user) return existingOAuthAccount.user;

    const userRepo = queryRunner.manager.getRepository(User);

    let user = dto.email
      ? await userRepo.findOne({ where: { email: dto.email } })
      : null;

    if (!user) {
      const newUser = userRepo.create({
        email: dto.email,
        full_name: dto.full_name,
        name: dto.full_name,
        avatar:
          dto.oauthProfile?.photos?.[0]?.value || dto.oauthProfile?.profileUrl,
      });

      newUser.markEmailAsVerified();
      user = await userRepo.save(newUser);
    }

    const account = oauthAccountRepo.create({
      provider: dto.provider,
      provider_id: dto.provider_id,
      email: dto.email,
      user,
    });
    await oauthAccountRepo.save(account);

    return user;
  }

  private async findOrCreateAccount(user: User, queryRunner: QueryRunner) {
    const clientAccountRepo = queryRunner.manager.getRepository(ClientAccount);

    const existingAccount = await clientAccountRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (existingAccount) return existingAccount;

    const suffix = crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .slice(0, 6);

    const newAccount = clientAccountRepo.create({
      user: {
        id: user.id,
      },
      uid: `AIB-USR-${suffix}`,
      name: user.full_name || user.name,
      avatar: user.avatar,
      email: user.email,
    });

    return clientAccountRepo.save(newAccount);
  }

  private async getTokens(account: ClientAccount) {
    const accessToken =
      await this.tokenCrypto.createAccessToken<IAccessTokenPayloadClient>({
        sub: account.id,
        email: account.email,
      });

    const { raw, hash } = await this.tokenCrypto.createRefreshToken();

    return {
      accessToken,
      refreshTokenRaw: raw,
      refreshTokenHash: hash,
    };
  }

  private async createSession(
    queryRunner: QueryRunner,
    user: User,
    refreshTokenHash: string,
    ip?: string,
    ua?: string,
  ) {
    const sessionRepo = queryRunner.manager.getRepository(Session);

    const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
    const newSession = sessionRepo.create({
      user,
      ip_address: ip,
      user_agent: ua,
      type: 'refresh_token',
      secret_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + SEVEN_DAYS_IN_MS),
    });
    return sessionRepo.save(newSession);
  }
}
