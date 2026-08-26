import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@/config/auth.config';
import { createGoogleStrategyOptions } from '@/modules/auth/api/strategies/abstract/goole-auth.options';
import { ClientAuthFacade } from '../auth.facade';

export interface ClientGoogleAuthResult {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  redirect_uri?: string;
}

@Injectable()
export class ClientGoogleStrategy extends PassportStrategy(
  Strategy,
  'client-google',
) {
  constructor(
    configService: ConfigService,
    private readonly clientAuthFacade: ClientAuthFacade,
  ) {
    const authConfig = configService.get<AuthConfig>('auth');

    if (!authConfig) {
      throw new Error('Auth Config not found');
    }

    super(
      createGoogleStrategyOptions(
        configService,
        authConfig.clientGoogleCallbackUrl,
      ),
    );
  }

  async validate(
    req: Request & {
      _strategy_validated?: boolean;
      user?: ClientGoogleAuthResult;
    },
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    if (req._strategy_validated) {
      return done(null, req.user);
    }
    req._strategy_validated = true;

    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Google account did not provide an email'));
    }

    const rawState = req?.query?.state as string | undefined;
    const redirectUri = this.parseRawState(rawState);

    try {
      const tokens = await this.clientAuthFacade.loginWithGoogle(
        {
          providerId: profile.id,
          email,
          name: profile.displayName,
          oauthProfile: profile,
        },
        req.ip,
        req.get('user-agent'),
      );
      return done(null, {
        tokens,
        redirect_uri: redirectUri,
      });
    } catch (err) {
      return done(err as Error);
    }
  }

  private parseRawState(rawState?: string) {
    if (typeof rawState !== 'string') {
      return undefined;
    }

    try {
      const decoded = rawState.includes('%')
        ? decodeURIComponent(rawState)
        : rawState;
      const parsed: unknown = JSON.parse(decoded);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'redirect_uri' in parsed &&
        typeof parsed.redirect_uri === 'string'
      ) {
        return parsed.redirect_uri;
      }
    } catch {
      try {
        const parsed: unknown = JSON.parse(decodeURIComponent(rawState));
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'redirect_uri' in parsed &&
          typeof parsed.redirect_uri === 'string'
        ) {
          return parsed.redirect_uri;
        }
      } catch {
        // Ignore invalid state
      }
    }

    return undefined;
  }
}
