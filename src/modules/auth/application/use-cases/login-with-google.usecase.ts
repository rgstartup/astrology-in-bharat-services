import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { Profile } from 'passport-google-oauth20';
import { DatabaseService } from '@/core/database/database.service';
import { AuthProfileCreationResolver } from '../strategies/create-profile/auth-profile-creation.resolver';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { OAuthAccount } from '../../infrastructure/entities/oauth-accounts.entity';
import { OAuthUserDto } from '../../api/dto';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { IAccessTokenPayload } from '@/common/types/access-token.payload';
import { Session } from '../../infrastructure/entities/session.entity';

@Injectable()
export class LoginWithGoogleUseCase {
  private readonly logger = new Logger(LoginWithGoogleUseCase.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly profileCreationResolver: AuthProfileCreationResolver,
  ) { }

  async execute(input: {
    providerId: string;
    email: string;
    name?: string;
    oauthProfile?: Profile;
    ip?: string;
    userAgent?: string;
    role?: RoleEnum;
  }) {
    const roleToAdd = input.role || RoleEnum.CLIENT;

    return this.db.transaction(async (qr) => {
      // 1. Check if user exists first to handle role restrictions
      // const existingUser = await qr.manager.findOne(User, {
      //   where: { email: input.email },
      // });

      // if (existingUser && roleToAdd === RoleEnum.EXPERT) {
      //   const role = existingUser.role;

      //   if (!hasRoles(role, 'EXPERT')) {
      //     throw new ForbiddenException(
      //       'Forbidden access. You do not have the required permissions.',
      //     );
      //   }
      // }

      const user = await this.findOrCreateUserFromOAuth(
        {
          provider: 'google',
          provider_id: input.providerId,
          email: input.email,
          name: input.name,
          role: roleToAdd,
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
      const session = await this.createSession(qr, user, refreshTokenHash, input.ip, input.userAgent);

      return {
        user,
        tokens: {
          accessToken,
          refreshToken: `${session.id}.${refreshTokenRaw}`,
        }
      };
    });
  }

  async findOrCreateUserFromOAuth(
    dto: OAuthUserDto,
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
        name: dto.name,
        avatar:
          dto.oauthProfile?.profileUrl ||
          dto.oauthProfile?.photos?.[0]?.value,
        role: dto.role,
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
    return this.profileCreationResolver.ensureProfile(user, queryRunner);
  }

  private async getTokens(user: User, profileId?: string) {
    const accessToken = await this.tokenCrypto.createAccessToken<IAccessTokenPayload>({
      sub: user.id,
      role: user.role,
      email: user.email,
      admin_permissions: user.admin_permissions,
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