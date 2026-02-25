// src/auth/strategies/google.strategy.ts
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@/config/auth.config';
import { instanceToPlain } from 'class-transformer';
import { LoginWithGoogleUseCase } from '../../application/use-cases/login-with-google.usecase';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
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
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
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
    // 3️⃣ Return both user and tokens to AuthController via Passport
    return done(
      null,
      instanceToPlain({
        user,
        ...tokens,
        redirect_uri: state?.redirect_uri,
      }),
    );
  }
}
