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
        (req: { cookies?: { accessToken?: string } }) =>
          req?.cookies?.accessToken ?? null,
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
