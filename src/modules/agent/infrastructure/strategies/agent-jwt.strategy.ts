import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthConfig } from '@/core/config/auth.config';
import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';
import { COOKIE_NAMES } from '@/modules/auth/application/helpers/cookie.helper';

@Injectable()
export class AgentJwtStrategy extends PassportStrategy(Strategy, 'agent-jwt') {
    constructor(
        config: ConfigService,
        @Inject(IAgentRepository)
        private agentRepository: IAgentRepository,
    ) {
        const authConfig = config.get<AuthConfig>('auth');

        if (!authConfig) {
            throw new Error('Auth Config not found');
        }

        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req) => req?.cookies?.[COOKIE_NAMES.ACCESS_TOKEN] || null,
            ]),
            secretOrKey: authConfig.jwtSecret,
            ignoreExpiration: false,
            jsonWebTokenOptions: {
                clockTolerance: 300,
            },
        });
    }

    async validate(payload: any) {
        if (payload.role !== 'agent') {
            throw new UnauthorizedException('Invalid token role');
        }
        const agent = await this.agentRepository.findById(payload.sub);
        if (!agent) {
            throw new UnauthorizedException('Agent not found');
        }
        return agent;
    }
}
