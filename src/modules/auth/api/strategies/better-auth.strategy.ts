import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@/config/auth.config';
import { BetterAuthUser } from '@/common/types/better-auth-user.type';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { createAuthClient } from 'better-auth/client';
import { Request } from 'express';

@Injectable()
export class BetterAuthStrategy extends PassportStrategy(
  Strategy,
  'better-auth',
) {
  private client;

  constructor(private readonly config: ConfigService) {
    super();
    const { betterAuthUrl } = this.config.get<AuthConfig>('auth')!;
    this.client = createAuthClient({ baseURL: betterAuthUrl });
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
      fetchOptions: { headers: { Authorization: `Bearer ${token}` } },
    });

    if (error || !data?.user) {
      throw new UnauthorizedException(error?.message || 'Could not verify session');
    }

    const user = data.user as BetterAuthUser;

    if (user.banned) throw new ForbiddenException('Your account has been banned');

    return { ...user, role: user.role ?? 'client' };
  }
}
