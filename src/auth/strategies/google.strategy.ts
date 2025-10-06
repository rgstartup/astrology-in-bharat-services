// src/auth/strategies/google.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { UsersService } from '../../users/users.service';
import { AuthConfig } from 'src/core/config/auth.config';
import { TokenService } from '../services/token.service';
import { OAuthService } from '../services/oauth.service';
import { DatabaseService } from 'src/core/database/database.service';
import { Request } from 'express';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private oauthService: OAuthService,
    private tokenService: TokenService,
    private db: DatabaseService,
  ) {
    const authConfig = config.get<AuthConfig>('auth');

    if (!authConfig) {
      throw new Error('Auth Config not found');
    }

    super({
      clientID: authConfig.googleClientId,
      clientSecret: authConfig.googleClientSecret,
      callbackURL: authConfig.googleCallbackUrl,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    const providerId = profile.id;

    if (!email) {
      throw new Error('Google account did not provide an email');
    }

    return await this.db.transaction(async (queryRunner) => {
      // 1️⃣ Find or create user
      const user = await this.oauthService.findOrCreateUserFromOAuth(
        {
          provider: 'google',
          providerId,
          email,
          name: profile.displayName,
          profile,
          roles: ['client'],
        },
        queryRunner,
      );

      // 2️⃣ Optionally store Google tokens if needed
      // Example: store refreshToken in DB if you want to refresh Google API access
      // await this.usersService.updateOAuthTokens(user.id, accessToken, refreshToken);

      // 2️⃣ Generate access + refresh tokens
      const tokens = await this.tokenService.generateTokens(
        user,
        req.ip,
        req.headers['user-agent'],
        queryRunner,
      );

      // 3️⃣ Return both user and tokens to AuthController via Passport
      return done(
        null,
        instanceToPlain({
          user,
          ...tokens,
        }),
      );
    });
  }
}
