// src/auth/strategies/google.strategy.ts
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@/config/auth.config';
import { LoginWithGoogleUseCase } from '../../application/use-cases/login-with-google.usecase';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    config: ConfigService,
    private readonly loginWithGoogle: LoginWithGoogleUseCase,
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
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (req._strategy_validated) {
      this.logger.log(`GoogleStrategy.validate already called for ${email}, skipping.`);
      return done(null, req.user);
    }
    req._strategy_validated = true;

    this.logger.log(`GoogleStrategy.validate called for ${email}`);
    const providerId = profile.id;

    if (!email) {
      return done(new Error('Google account did not provide an email'));
    }

    const rawState = req?.query?.state as string | undefined;
    let state: any = {};
    if (rawState) {
      try {
        state = JSON.parse(decodeURIComponent(rawState));
      } catch {
        state = {};
      }
    }

    const { user, tokens } = await this.loginWithGoogle.execute({
      providerId,
      email,
      name: profile.displayName,
      profile,
      ip: req?.ip,
      userAgent: req.get('user-agent'),
      role: state?.role,
    });

    const authResult = {
      user,
      ...tokens,
      redirectUri: state?.redirect_uri || state?.redirectUrl,
    };

    this.logger.log(`Google auth validated for ${email}. Tokens present: ${!!authResult.accessToken}`);

    // 3️⃣ Return user, tokens, and redirectUri to AuthController via Passport
    return done(null, authResult);
  }
}
