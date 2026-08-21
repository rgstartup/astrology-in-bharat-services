import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  hasRoles,
  RoleEnum,
} from '@/modules/users/infrastructure/enums/Role.enum';
import { Profile } from 'passport-google-oauth20';
import { DatabaseService } from '@/core/database/database.service';
import { OAuthService } from '../../infrastructure/services/oauth.service';
import { AuthTokenService } from '../services/auth-token.service';
import { AuthProfileCreationResolver } from '../strategies/create-profile/auth-profile-creation.resolver';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { OAuthAccount } from '../../infrastructure/entities/oauth-accounts.entity';
import { OAuthUserDto } from '../../api/dto';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';

@Injectable()
export class LoginWithGoogleUseCase {
  private readonly logger = new Logger(LoginWithGoogleUseCase.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly profileCreationResolver: AuthProfileCreationResolver,
    // @InjectRepository(User)
    // private readonly userRepository: Repository<User>,
  ) { }

  async execute(input: {
    providerId: string;
    email: string;
    name?: string;
    profile?: Profile;
    ip?: string;
    userAgent?: string;
    role?: RoleEnum;
  }) {
    const roleToAdd = input.role || RoleEnum.CLIENT;

    return this.db.transaction(async (qr) => {
      // 1. Check if user exists first to handle role restrictions
      const existingUser = await qr.manager.findOne(User, {
        where: { email: input.email },
      });

      if (existingUser && roleToAdd === RoleEnum.EXPERT) {
        const role = existingUser.role;

        if (!hasRoles(role, 'EXPERT')) {
          throw new ForbiddenException(
            'Forbidden access. You do not have the required permissions.',
          );
        }
      }

      const user = await this.findOrCreateUserFromOAuth(
        {
          provider: 'google',
          provider_id: input.providerId,
          email: input.email,
          name: input.name,
          role: roleToAdd,
          profile: input.profile,
        },
        qr,
      );

      const profile = await this.profileCreationResolver.ensureProfile(user, qr);

      const tokens = await this.issueAuthTokens(
        user,
        roleToAdd,
        input.ip,
        input.userAgent,
        qr,
      );

      return { user, tokens };
    });
  }

  private async findByProvider(provider: string, providerId: string, queryRunner: QueryRunner) {
    const repo = queryRunner.manager.getRepository(OAuthAccount)

    return repo.findOne({
      where: { provider, provider_id: providerId },
      relations: ['user'],
    });
  }

  private async linkAccount(
    data: Partial<OAuthAccount>,
    queryRunner: QueryRunner,
  ) {
    const repo = queryRunner.manager.getRepository(OAuthAccount);
    const account = repo.create(data);
    return repo.save(account);
  }

  async findOrCreateUserFromOAuth(
    dto: OAuthUserDto,
    queryRunner: QueryRunner,
  ): Promise<User> {
    const oauth = await this.findByProvider(dto.provider, dto.provider_id, queryRunner);

    if (oauth?.user) return oauth.user;

    const user = await this.findOrCreateUser(dto, queryRunner);

    await this.linkAccount({ ...dto, user }, queryRunner);
    return user;
  }

  private async findOrCreateUser(dto: OAuthUserDto, queryRunner: QueryRunner) {
    const userRepo = queryRunner.manager.getRepository(User);

    if (dto.email) {
      const user = await userRepo.findOne({ where: { email: dto.email } })
      if (user) return user
    }

    const newUser = userRepo.create({
      email: dto.email,
      name: dto.name,
      avatar: dto.profile?.profileUrl || dto.profile?.photos?.[0]?.value,
      role: dto.role,
    });

    newUser.markEmailAsVerified();

    return userRepo.save(newUser);
  }

  private issueTokens() {
    const accessTokens = this.tokenCrypto.createAccessToken({})
  }
}
