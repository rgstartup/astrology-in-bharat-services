import { Injectable } from '@nestjs/common';
import { Profile } from 'passport-google-oauth20';
import { DatabaseService } from '@/core/database/database.service';
import { OAuthService } from '../../infrastructure/persistence/services/oauth.service';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.usecase';

@Injectable()
export class LoginWithGoogleUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly oauthService: OAuthService,
    private readonly issueTokens: IssueAuthTokensUseCase,
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
