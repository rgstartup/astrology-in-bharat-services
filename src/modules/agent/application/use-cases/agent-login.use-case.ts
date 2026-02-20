import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';
import { AgentLoginDto } from '../dtos/agent-login.dto';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import ms from 'ms';
import { AuthConfig } from '@/core/config/auth.config';

@Injectable()
export class AgentLoginUseCase {
    private jwtConfig: AuthConfig;

    constructor(
        @Inject(IAgentRepository)
        private readonly agentRepository: IAgentRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {
        this.jwtConfig = this.configService.get<AuthConfig>('auth')!;
    }

    async execute(dto: AgentLoginDto, ip?: string, userAgent?: string) {
        const agent = await this.agentRepository.findByEmail(dto.email);

        if (!agent) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await argon2.verify(agent.password, dto.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (agent.status !== 'active') {
            throw new UnauthorizedException(`Agent account is ${agent.status}`);
        }

        const tokens = await this.generateTokens(agent, ip, userAgent);

        return {
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            agent: {
                id: agent.id,
                agent_id: agent.agent_id,
                name: agent.name,
                email: agent.email,
                phone: agent.phone,
                status: agent.status,
                avatar: agent.avatar,
            },
        };
    }

    async generateTokens(agent: any, ip?: string, userAgent?: string) {
        const accessToken = await this.jwtService.signAsync(
            { sub: agent.id, email: agent.email, role: 'agent', agent_id: agent.agent_id },
            { expiresIn: this.jwtConfig.jwtExpiresIn as any }
        );

        const refreshTokenRaw = randomBytes(64).toString('hex');
        const refreshTokenHash = await argon2.hash(refreshTokenRaw);

        const expiresInMs = ms(this.jwtConfig.refreshTokenExpiresIn as ms.StringValue);

        const credential = this.agentRepository.createCredential({
            agentId: agent.id,
            secretHash: refreshTokenHash,
            type: 'refresh_token',
            expiresAt: new Date(Date.now() + expiresInMs),
            ipAddress: ip,
            userAgent,
        });

        await this.agentRepository.saveCredential(credential);

        return {
            accessToken,
            refreshToken: `${agent.id}.${refreshTokenRaw}`,
        };
    }

    async refreshTokens(agentId: string, refreshToken?: string) {
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not provided');
        }

        // 🛡️ SECURITY FIX: Ensure agentId is a valid UUID to prevent Postgres syntax errors (like "162" error)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(agentId)) {
            throw new UnauthorizedException('Invalid agent session ID format. Please login again.');
        }

        const creds = await this.agentRepository.findCredentials({
            where: { agentId, type: 'refresh_token', revoked: false },
        });

        for (const c of creds) {
            if (c.expiresAt < new Date()) continue;
            const valid = await argon2.verify(c.secretHash, refreshToken);
            if (valid) {
                const agent = await this.agentRepository.findById(agentId);
                if (!agent) throw new UnauthorizedException('Agent not found');
                return this.generateTokens(agent);
            }
        }

        throw new UnauthorizedException('Invalid refresh token');
    }
}
