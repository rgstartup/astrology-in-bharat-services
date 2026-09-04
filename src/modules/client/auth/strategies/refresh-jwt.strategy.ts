import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';

@Injectable()
export class ClientJwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'client-jwt-refresh',
) {
  validate(req: Request) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const authHeader = req.headers?.authorization;
    const bodyToken = (req.body as Record<string, string> | undefined)
      ?.refreshToken;

    const refreshToken =
      cookies?.refreshToken ||
      authHeader?.replace(/^Bearer\s+/i, '') ||
      bodyToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    (req as unknown as Record<string, unknown>)['refreshToken'] = refreshToken;

    return true;
  }
}
