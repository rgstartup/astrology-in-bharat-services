// src/auth/token.service.ts
import * as argon2 from 'argon2';
import ms from 'ms';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { QueryRunner, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { Session } from '../entities/session.entity';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@/config/auth.config';
import { BaseService } from 'src/common/services/transaction.service';

@Injectable()
export class TokenService extends BaseService<Session> {
  private readonly jwtConfig: AuthConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,

    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {
    super(sessionRepo);
    const config = this.configService.get<AuthConfig>('auth');

    if (!config) {
      throw new Error('JWT config not found');
    }

    this.jwtConfig = config;
  }

  async generateTokens(
    user: User,
    ip?: string,
    userAgent?: string,
    queryRunner?: QueryRunner,
  ) {
    const rolesMap: Record<string, string> = {
      client: 'user',
      expert: 'agent',
      admin: 'admin',
    };
    const primaryRole = user.roles?.[0]?.name || 'client';
    const accessToken = await this.jwtService.signAsync(
      { userId: user.id, role: rolesMap[primaryRole] || primaryRole },
      { expiresIn: this.jwtConfig?.jwtExpiresIn as any },
    );

    const refreshTokenRaw = randomBytes(64).toString('hex');
    const refreshTokenHash = await argon2.hash(refreshTokenRaw);

    const expiresInMs = ms(
      this.jwtConfig.refreshTokenExpiresIn as ms.StringValue,
    );

    const repo = this.getRepo(queryRunner);

    const credential = repo.create({
      user,
      secret_hash: refreshTokenHash,
      type: 'refresh_token',
      expires_at: new Date(Date.now() + expiresInMs),
      ip_address: ip,
      user_agent: userAgent,
    });

    await repo.save(credential);
    return { accessToken, refreshToken: refreshTokenRaw };
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const creds = await this.sessionRepo.find({
      where: { user: { id: userId }, type: 'refresh_token', revoked: false },
    });

    for (const c of creds) {
      if (c.expires_at < new Date()) continue;
      const valid = await argon2.verify(c.secret_hash, refreshToken);
      if (valid) return this.generateTokens({ id: userId } as User);
    }

    throw new Error('Invalid refresh token');
  }

  generate5MinToken<T extends object>(payload: T) {
    return this.jwtService.sign(payload, {
      expiresIn: 5 * 60 * 1000,
      secret: this.jwtConfig.jwtSecret,
    });
  }

  async revoke(userId: number) {
    await this.sessionRepo.update({ user: { id: userId } }, { revoked: true });
  }

  async verifyToken(token: string) {
    return this.jwtService.verifyAsync<{ userId: number; email: string }>(
      token,
      {
        secret: this.jwtConfig.jwtSecret,
        clockTolerance: 10,
      },
    );
  }
}
