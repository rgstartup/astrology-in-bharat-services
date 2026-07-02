import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(req: Request) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const authHeader = req.headers?.authorization;
    
    console.log('[JwtRefreshStrategy] Incoming request headers:', req.headers);
    console.log('[JwtRefreshStrategy] Incoming request cookies:', cookies);

    const refreshToken =
      cookies?.refreshToken ||
      authHeader?.replace('Bearer ', '');

    console.log('[JwtRefreshStrategy] Extracted refreshToken:', refreshToken ? 'Found' : 'Missing');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    // Attach for downstream use
    (req as unknown as Record<string, unknown>)['refreshToken'] = refreshToken;

    return true;
  }
}
