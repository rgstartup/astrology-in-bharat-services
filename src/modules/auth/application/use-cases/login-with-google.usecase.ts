import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Profile } from 'passport-google-oauth20';
import { DatabaseService } from '@/core/database/database.service';
import { OAuthService } from '../../infrastructure/services/oauth.service';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.usecase';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { AuthProfileCreationResolver } from '../strategies/auth-profile-creation.resolver';

@Injectable()
export class LoginWithGoogleUseCase {
  private readonly logger = new Logger(LoginWithGoogleUseCase.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly oauthService: OAuthService,
    private readonly issueTokens: IssueAuthTokensUseCase,
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
    role?: string;
  }) {
    return this.db.transaction(async (qr) => {
      // 1. Check if user exists first to handle role restrictions
      const existingUser = await this.usersFacade.findByEmail(input.email, qr);
      this.logger.log(
        `Google Login attempt for ${input.email}. Requested role: ${input.role}. Existing user: ${!!existingUser}`,
      );

      if (existingUser && input.role === 'expert') {
        const roles =
          existingUser.roles?.map((r) => r.name.toLowerCase()) || [];
        this.logger.log(`Existing user roles: ${roles.join(', ')}`);

        if (!roles.includes('expert')) {
          this.logger.warn(
            `User ${input.email} is not an expert. Blocking login.`,
          );
          throw new ForbiddenException(
            'This account is registered as a customer. Please use an astrologer account.',
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
          roles: input.role ? [input.role] : undefined,
        },
        qr,
      );

      await this.profileCreationResolver.ensureProfile(user, qr);

      const tokens = await this.issueTokens.execute(
        user,
        input.ip,
        input.userAgent,
        qr,
      );

      return { user, tokens };
    });
  }
}
