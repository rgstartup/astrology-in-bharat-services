import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { SessionRepository } from '../../infrastructure/repositories/session.repository';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { FindProfileResolver } from '../strategies/find-profile/find-profile.resolver';
import { IAccessTokenPayload } from '@/common/types/access-token.payload';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly tokenCrypto: TokenCryptoService,
    private readonly sessionRepo: SessionRepository,
    private readonly findProfileResolver: FindProfileResolver,
  ) {}

  async issueAuthTokens(
    user: User,
    targetRole?: RoleEnum,
    ip?: string,
    ua?: string,
    queryRunner?: QueryRunner,
  ) {
    const profileId = await this.findProfileForRole(user.id, targetRole);

    const accessToken =
      await this.tokenCrypto.createAccessToken<IAccessTokenPayload>({
        sub: user.id,
        roles: user.roles,
        email: user.email,
        profile: profileId ?? undefined,
        admin_permissions: user.admin_permissions ?? null,
      });

    const { raw, hash } = await this.tokenCrypto.createRefreshToken();

    const savedSession = await this.sessionRepo.storeRefreshToken(
      {
        user,
        ip_address: ip,
        user_agent: ua,
        type: 'refresh_token',
        secret_hash: hash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      queryRunner,
    );

    return { accessToken, refreshToken: `${savedSession.id}.${raw}` };
  }

  private async findProfileForRole(
    userId: string,
    targetRole?: RoleEnum,
  ): Promise<string | null> {
    if (!targetRole) return null;

    const profileId = await this.findProfileResolver.findProfile(
      userId,
      targetRole,
    );

    return profileId;
  }
}
