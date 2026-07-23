import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  hasRoles,
  RoleEnum,
} from '@/modules/users/infrastructure/enums/Role.enum';
import { Profile } from 'passport-google-oauth20';
import { DatabaseService } from '@/core/database/database.service';
import { OAuthService } from '../../infrastructure/services/oauth.service';
import { AuthTokenService } from '../services/auth-token.service';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { AuthProfileCreationResolver } from '../strategies/create-profile/auth-profile-creation.resolver';

@Injectable()
export class LoginWithGoogleUseCase {
  private readonly logger = new Logger(LoginWithGoogleUseCase.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly oauthService: OAuthService,
    private readonly authTokenService: AuthTokenService,
    private readonly profileCreationResolver: AuthProfileCreationResolver,
    private readonly usersFacade: UsersFacade,
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
      const existingUser = await this.usersFacade.findByEmail(input.email, qr);
      this.logger.log(
        `Google Login attempt for ${input.email}. Requested role: ${roleToAdd}. Existing user: ${!!existingUser}`,
      );

      if (existingUser && roleToAdd === RoleEnum.EXPERT) {
        const roles = existingUser.roles || [];
        this.logger.log(`Existing user roles: ${roles.join(', ')}`);

        if (!hasRoles(roles, 'EXPERT')) {
          this.logger.warn(
            `User ${input.email} is not an expert. Blocking login.`,
          );
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
