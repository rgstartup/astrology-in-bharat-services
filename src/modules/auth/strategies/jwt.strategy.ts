// src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@/modules/users/users.service';
import { AuthConfig } from 'src/core/config/auth.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private usersService: UsersService,
  ) {
    const authConfig = config.get<AuthConfig>('auth');

    if (!authConfig) {
      throw new Error('Auth Config not found');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          const cookieToken = req?.cookies?.accessToken;
          const authHeader = req?.headers?.authorization;
          console.log('🔑 JWT Extraction Debug:', {
            hasCookie: !!cookieToken,
            hasAuthHeader: !!authHeader,
            url: req?.url,
            method: req?.method
          });
          return cookieToken;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: authConfig.jwtSecret,
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    return user;
  }
}
