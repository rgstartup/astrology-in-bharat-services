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
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class LoginWithGoogleUseCase {
  private readonly logger = new Logger(LoginWithGoogleUseCase.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly oauthService: OAuthService,
    private readonly authTokenService: AuthTokenService,
    private readonly profileCreationResolver: AuthProfileCreationResolver,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(input: {
    providerId: string;
    email: string;
    name?: string;
    profile: Profile;
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
        const roles = existingUser.roles || [];

        if (!hasRoles(roles, 'EXPERT')) {
          throw new ForbiddenException(
            'Forbidden access. You do not have the required permissions.',
          );
        }
      }

      const user = await this.oauthService.findOrCreateUserFromOAuth(
        {
          provider: 'google',
          provider_id: input.providerId,
          email: input.email,
          name: input.name,
          profile: input.profile,
          roles: [roleToAdd],
        },
        qr,
      );

      await this.profileCreationResolver.ensureProfile(user, qr);

      const tokens = await this.authTokenService.issueAuthTokens(
        user,
        roleToAdd,
        input.ip,
        input.userAgent,
        qr,
      );

      return { user, tokens };
    });
  }
}
