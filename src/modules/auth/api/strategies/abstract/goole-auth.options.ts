import { AuthConfig } from '@/config/auth.config';
import type { ConfigService } from '@nestjs/config';
import type { StrategyOptionsWithRequest } from 'passport-google-oauth20';

export function createGoogleStrategyOptions(
  configService: ConfigService,
  callbackURL: string,
): StrategyOptionsWithRequest {
  const authConfig = configService.get<AuthConfig>('auth');

  if (!authConfig) {
    throw new Error('Auth Config not found');
  }

  return {
    clientID: authConfig.googleClientId,
    clientSecret: authConfig.googleClientSecret,
    callbackURL,
    scope: ['email', 'profile'],
    passReqToCallback: true,
  };
}
