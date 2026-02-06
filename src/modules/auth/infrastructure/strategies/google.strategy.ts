import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Request } from 'express';
import { instanceToPlain } from 'class-transformer';
import { AuthConfig } from '@/core/config/auth.config';
import { DatabaseService } from '@/core/database/database.service';
import { OAuthAccount } from '@/modules/auth/domain/entities/oauth-accounts.entity';
import { OAuthService } from '../../application/services/oauth.service';
import { TokenService } from '../../application/services/token.service';

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
    const { emails, photos, id, displayName } = profile;
    const email = emails?.[0]?.value;

    // Use state for role and other context
    let role = 'client';
    try {
      const state = (req.query as any).state
        ? JSON.parse((req.query as any).state as string)
        : {};
      role = state.role === 'expert' ? 'expert' : 'client';
    } catch (e) {
      console.error('Error parsing Google OAuth state:', e);
    }

    const { user, tokens } = await this.db.transaction(async (queryRunner) => {
      const user = await this.oauthService.findOrCreateUserFromOAuth(
        {
          provider: 'google',
          providerId: id,
          email: email!,
          name: displayName,
          avatar: photos?.[0]?.value,
          role,
        },
        queryRunner.manager.getRepository(OAuthAccount) as any,
      );

      const tokens = await this.tokenService.generateTokens(
        user,
        req.ip,
        req.get('user-agent'),
      );

      return { user, tokens };
    });

    done(null, {
      ...instanceToPlain(user),
      ...tokens,
    });
  }
}
