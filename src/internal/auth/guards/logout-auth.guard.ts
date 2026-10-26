import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

/**
 * Legacy auth guard for logout that ignores token expiration.
 *
 * Utilizes the globally configured JwtService with `{ ignoreExpiration: true }`.
 * When a validly signed token is present (even if expired), the user payload is
 * attached to `req.user`. If no token is provided or the token is malformed,
 * the guard still permits the request so cookies can be cleared without throwing 401.
 */
@Injectable()
export class JwtLogoutAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

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
      const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(
        token,
        {
          ignoreExpiration: true,
        },
      );

      if (payload?.sub) {
        (req as unknown as Record<string, unknown>)['user'] = {
          id: String(payload.sub),
          ...payload,
        };
      }
    } catch {
      // Malformed or invalid signature — allow request to proceed to clear cookies
    }

    return true;
  }
}
