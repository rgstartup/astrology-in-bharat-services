import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@/config/auth.config';
import {
  IAccessTokenPayload,
  IUser,
} from '@/common/types/access-token.payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const authConfig = config.get<AuthConfig>('auth');

    if (!authConfig) {
      throw new Error('Auth Config not found');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: import('express').Request) => {
          console.log('[JwtStrategy] Incoming request to:', req.url);
          console.log('[JwtStrategy] Incoming request headers:', req.headers);
          console.log('[JwtStrategy] Incoming request cookies:', req.cookies);
          const token = req?.cookies?.accessToken ?? null;
          console.log('[JwtStrategy] Extracted accessToken from cookies:', token ? 'Found' : 'Missing');
          return token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: authConfig.jwtSecret,
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: IAccessTokenPayload): Promise<IUser> {
    // We return a simplified user object based on the JWT payload.
    // This avoids a database hit on every protected request.
    return {
      id: payload.sub,
      ...payload,
    };
  }
}
