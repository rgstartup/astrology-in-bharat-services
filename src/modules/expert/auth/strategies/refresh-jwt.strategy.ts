import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';

@Injectable()
export class ExpertJwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'expert-jwt-refresh',
) {
  validate(req: Request) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const body = req.body as Record<string, string> | undefined;
    const token =
      cookies?.refreshToken ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
      body?.refreshToken;

    if (!token) throw new UnauthorizedException('Refresh token missing');
    (req as unknown as Record<string, unknown>)['refreshToken'] = token;
    return true;
  }
}
