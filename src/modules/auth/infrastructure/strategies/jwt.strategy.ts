import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthConfig } from '@/core/config/auth.config';
import { UsersService } from '@/modules/users/application/services/users.service';

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
