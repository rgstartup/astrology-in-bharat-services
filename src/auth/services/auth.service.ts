// src/auth/auth.service.ts
import * as argon2 from 'argon2';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { TokenService } from './token.service';
import { RegisterDto, LoginDto } from '../dto';
import { OAuthUserDto } from '../dto/oauth-user.dto';
import { OAuthService } from './oauth.service';
import { DatabaseService } from 'src/core/database/database.service';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tokenService: TokenService,
    private oauthService: OAuthService,
    private db: DatabaseService,
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const hashed = await argon2.hash(dto.password, { type: argon2.argon2id });

    const { roles, ...registerDto } = dto;

    const formattedRoles = roles.map((r) => ({
      name: r,
    }));
    return await this.db.transaction(async (queryRunner) => {
      const user = await this.usersService.create(
        { ...registerDto, roles: formattedRoles, password: hashed },
        queryRunner,
      );
      const tokens = await this.tokenService.generateTokens(
        user,
        ip,
        userAgent,
        queryRunner,
      );
      return instanceToPlain({ user, ...tokens });
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.password, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.validateUser(dto.email, dto.password);
    const tokens = await this.tokenService.generateTokens(user, ip, userAgent);
    return instanceToPlain({ user, ...tokens });
  }

  async oauthLogin(dto: OAuthUserDto, ip?: string, userAgent?: string) {
    // Find or create the user based on OAuth info
    const user = await this.oauthService.findOrCreateUserFromOAuth(dto);

    // Generate tokens for the user (access + refresh)
    const tokens = await this.tokenService.generateTokens(user, ip, userAgent);

    return { user, ...tokens };
  }

  async logout(id: number) {
    await this.tokenService.revoke(id);
  }
}
