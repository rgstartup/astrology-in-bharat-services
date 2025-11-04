// src/auth/token.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { QueryRunner, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/users/entities/user.entity';
import { Credential } from '../entities/credential.entity';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from 'src/core/config/auth.config';
import { BaseService } from 'src/common/services/transaction.service';
import * as ms from 'ms';

@Injectable()
export class TokenService extends BaseService<Credential> {
  private jwtConfig: AuthConfig;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,

    @InjectRepository(Credential)
    private credentialsRepo: Repository<Credential>,
  ) {
    super(credentialsRepo);
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
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, roles: user.roles.map((r) => r.name) },
      { expiresIn: this.jwtConfig?.jwtExpiresIn },
    );

    const refreshTokenRaw = randomBytes(64).toString('hex');
    const refreshTokenHash = await argon2.hash(refreshTokenRaw);

    const expiresInMs = ms(
      this.jwtConfig.refreshTokenExpiresIn as ms.StringValue,
    );

    const repo = this.getRepo(queryRunner);

    const credential = repo.create({
      user,
      secretHash: refreshTokenHash,
      type: 'refresh_token',
      expiresAt: new Date(Date.now() + expiresInMs),
      ipAddress: ip,
      userAgent,
    });

    await repo.save(credential);
    return { accessToken, refreshToken: refreshTokenRaw };
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const creds = await this.credentialsRepo.find({
      where: { user: { id: userId }, type: 'refresh_token', revoked: false },
    });

    for (const c of creds) {
      if (c.expiresAt < new Date()) continue;
      const valid = await argon2.verify(c.secretHash, refreshToken);
      if (valid) return this.generateTokens({ id: userId } as User);
    }

    throw new Error('Invalid refresh token');
  }

  async revoke(userId: number) {
    await this.credentialsRepo.update(
      { user: { id: userId } },
      { revoked: true },
    );
  }
}
