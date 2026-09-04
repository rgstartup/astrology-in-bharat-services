import { AuthConfig } from '@/config/auth.config';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ExtractJwt, StrategyOptionsWithoutRequest } from 'passport-jwt';

type AuthRequest = Request & {
  cookies: {
    accessToken?: string;
  };
};

export function createJwtStrategyOptions(
  config: ConfigService,
): StrategyOptionsWithoutRequest {
  const authConfig = config.get<AuthConfig>('auth');

  if (!authConfig) {
    throw new Error('Auth Config not found');
  }

  return {
    jwtFromRequest: ExtractJwt.fromExtractors([
      (req: AuthRequest) => {
        const cookies = req.cookies;

        return cookies?.accessToken ?? null;
      },

      ExtractJwt.fromAuthHeaderAsBearerToken(),
    ]),
    secretOrKey: authConfig.jwtSecret,
  };
}
