import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@/config/auth.config';
import {
  IAccessTokenPayload,
  IUser,
} from '@/common/types/access-token.payload';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const authConfig = config.get<AuthConfig>('auth');

    if (!authConfig) {
      throw new Error('Auth Config not found');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: import('express').Request) => {
          const cookies = req?.cookies as Record<string, string> | undefined;
          const token = cookies?.accessToken ?? null;
          return token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: authConfig.jwtSecret,
    });
  }

  async validate(payload: IAccessTokenPayload): Promise<IUser> {
    // Perform a live DB check to ensure the user hasn't been deleted or blocked
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: ['id', 'roles', 'admin_permissions', 'email'],
    });

    if (!user) {
      throw new UnauthorizedException(
        'User account has been deleted or disabled',
      );
    }

    return {
      id: payload.sub,
      ...payload,
      roles: user.roles,
      admin_permissions: user.admin_permissions,
    };
  }
}
