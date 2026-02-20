import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthConfig } from '@/core/config/auth.config';
import { UsersService } from '@/modules/users/application/services/users.service';
import { ADMIN_COOKIE_NAMES } from '@/modules/auth/application/helpers/cookie.helper';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
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
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req) => req?.cookies?.[ADMIN_COOKIE_NAMES.ACCESS_TOKEN] || null,
            ]),
            secretOrKey: authConfig.jwtSecret,
            ignoreExpiration: false,
            jsonWebTokenOptions: {
                clockTolerance: 300,
            },
        });
    }

    async validate(payload: any) {
        // payload structure: { sub: userId, role: 'admin', ... }
        const user = await this.usersService.findById(payload.sub);

        if (!user) {
            throw new UnauthorizedException('Admin user not found');
        }

        // Double check role claim in payload for security
        if (payload.role !== 'admin' && user.role !== 'admin') {
            throw new UnauthorizedException('Insufficient permissions');
        }

        return user;
    }
}
