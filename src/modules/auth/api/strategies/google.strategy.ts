// src/auth/strategies/google.strategy.ts
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@/config/auth.config';
import { LoginWithGoogleUseCase } from '../../application/use-cases/login-with-google.usecase';
import { GoogleLoginQueryDto } from '../dto/login.dto';

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
    req: Request & {
      _strategy_validated?: boolean;
      user?: Record<string, unknown>;
    },
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (req._strategy_validated) {
      return done(null, req.user);
    }
    req._strategy_validated = true;

    const providerId = profile.id;

    if (!email) {
      return done(new Error('Google account did not provide an email'));
    }

    const rawState = req?.query?.state;
    const state = this.parseOAuthState(rawState);

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
      redirect_uri: state?.redirect_uri,
    };

    return done(null, authResult);
  }

  private parseOAuthState(rawState: unknown): GoogleLoginQueryDto | undefined {
    if (typeof rawState !== 'string') {
      return undefined;
    }

    try {
      return JSON.parse(rawState) as GoogleLoginQueryDto;
    } catch {
      return undefined;
    }
  }
}
