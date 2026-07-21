import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@/config/auth.config';
import {
  IAccessTokenPayload,
  IUser,
} from '@/common/types/access-token.payload';
import { UsersFacade } from '@/modules/users/application/users.facade';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersFacade: UsersFacade,
  ) {
    const authConfig = config.get<AuthConfig>('auth');

    if (!authConfig) {
      throw new Error('Auth Config not found');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: import('express').Request) => {
          const token = req?.cookies?.accessToken ?? null;
          return token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: authConfig.jwtSecret,
    });
  }

  async validate(payload: IAccessTokenPayload): Promise<IUser> {
    // Perform a live DB check to ensure the user hasn't been deleted or blocked
    const user = await this.usersFacade.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User account has been deleted or disabled');
    }

    return {
      id: payload.sub,
      ...payload,
      roles: user.roles,
      admin_permissions: user.admin_permissions,
    };
  }
}
