import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AuthConfig } from '@/config/auth.config';
import { BetterAuthUser } from '@/common/types/better-auth-user.type';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';
import { createAuthClient } from 'better-auth/client';
import { Request } from 'express';

@Injectable()
export class BetterAuthStrategy extends PassportStrategy(
  Strategy,
  'better-auth',
) {
  private client;

  constructor(
    private readonly config: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super();
    const { betterAuthUrl } = this.config.get<AuthConfig>('auth')!;
    this.client = createAuthClient({
      baseURL: betterAuthUrl,
    });
  }

  async validate(req: Request): Promise<AuthenticatedUser> {
    const authHeader = req.headers['authorization'];
    // Accept Authorization header first; fall back to the better-auth session cookie
    // forwarded by the Next.js proxy so browser requests work without a Bearer header.
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (req.cookies?.['better-auth.session_token'] ?? null);

    if (!token) throw new UnauthorizedException('No bearer token provided');

    const { data, error } = await this.client.getSession({
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    if (error || !data?.user) {
      throw new UnauthorizedException(
        error?.message || 'Could not verify session',
      );
    }

    const betterAuthUser = data.user as BetterAuthUser;

    let localUser = await this.userRepository.findByBetterAuthId(betterAuthUser.id);
    if (!localUser) {
      const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
      const role = betterAuthUser.role ?? 'client';
      const uid = role === 'expert' ? `AIB-EXP-${suffix}` : `AIB-USR-${suffix}`;
      localUser = await this.userRepository.create({
        better_auth_user_id: betterAuthUser.id,
        email: betterAuthUser.email,
        name: betterAuthUser.name,
        role,
        uid,
      });
    }

    return { ...betterAuthUser, localUserId: localUser.id };
  }
}
