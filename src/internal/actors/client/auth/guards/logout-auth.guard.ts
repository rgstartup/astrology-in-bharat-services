import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientAccounts } from '@/core/drizzledb/schema';
import type { ClientJwtPayload } from '../strategies/jwt.strategy';

/**
 * Auth guard for client logout that ignores token expiration.
 *
 * Utilizes the globally configured JwtService with `{ ignoreExpiration: true }`.
 * When a validly signed token is present (even if expired past its 15-minute lifetime),
 * the client account identity is resolved and attached to `req.user`.
 * If no token is provided or the token is malformed, the guard still permits the request
 * so cookies can be cleared on the response without triggering a 401 Unauthorized.
 */
@Injectable()
export class ClientJwtLogoutAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  /**
   * Validates request credentials ignoring token expiration.
   *
   * @param context - Execution context of the incoming request.
   * @returns Always returns true to allow the logout endpoint to clear cookies.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const token =
      cookies?.accessToken ??
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync<ClientJwtPayload>(
        token,
        {
          ignoreExpiration: true,
        },
      );

      if (payload?.sub) {
        const [account] = await this.db
          .select({
            id: clientAccounts.id,
            user_id: clientAccounts.user_id,
            email: clientAccounts.email,
            is_blocked: clientAccounts.is_blocked,
          })
          .from(clientAccounts)
          .where(eq(clientAccounts.id, Number(payload.sub)))
          .limit(1);

        if (account) {
          (req as unknown as Record<string, unknown>)['user'] = account;
        }
      }
    } catch {
      // Malformed token or invalid signature — allow request to proceed so cookies get cleared
    }

    return true;
  }
}
