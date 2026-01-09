// src/auth/token.service.ts
import * as argon2 from 'argon2';
import * as ms from 'ms';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { QueryRunner, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { Credential } from '../entities/credential.entity';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from 'src/core/config/auth.config';
import { BaseService } from 'src/common/services/transaction.service';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TokenService extends BaseService<Credential> {
  private jwtConfig: AuthConfig;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,

    @InjectRepository(Credential)
    private credentialsRepo: Repository<Credential>,

    @InjectRepository(User)
    private usersRepo: Repository<User>,
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
      { sub: user.id, roles: user.roles?.map((r) => r.name) || [] },
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
      secretHash: refreshTokenHash,
      type: 'refresh_token',
      expiresAt: new Date(Date.now() + expiresInMs),
      ipAddress: ip,
      userAgent,
    });

    await repo.save(credential);
    // Return composite token: userId.secret
    return { accessToken, refreshToken: `${user.id}.${refreshTokenRaw}` };
  }

  async refreshTokens(userId: number, refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const creds = await this.credentialsRepo.find({
      where: { user: { id: userId }, type: 'refresh_token', revoked: false },
    });

    for (const c of creds) {
      if (c.expiresAt < new Date()) continue;
      const valid = await argon2.verify(c.secretHash, refreshToken);
      if (valid) {
        // Fetch full user with roles to prevent 500 error in generateTokens
        const user = await this.usersRepo.findOne({
          where: { id: userId },
          relations: ['roles'],
        });

        if (!user) throw new UnauthorizedException('User not found');

        return this.generateTokens(user);
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  generate5MinToken<T extends object>(payload: T) {
    return this.jwtService.sign(payload, {
      expiresIn: 15 * 60 * 1000,
      secret: this.jwtConfig.jwtSecret,
    });
  }

  async revoke(userId: number) {
    await this.credentialsRepo.update(
      { user: { id: userId } },
      { revoked: true },
    );
  }

  async verifyToken(token: string) {
    return this.jwtService.verifyAsync<{ sub: number; email: string }>(token, {
      secret: this.jwtConfig.jwtSecret,
      clockTolerance: 10,
    });
  }
}
