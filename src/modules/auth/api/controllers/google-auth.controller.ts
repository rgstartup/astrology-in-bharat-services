import {
  BadRequestException,
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import 'dotenv/config';

@Controller({
  path: 'auth/google',
  version: '1',
})
export class GoogleAuthController {
  constructor(private readonly config: ConfigService) { }

  private resolveFrontendUrl(req: Request, authData: any): string {
    const fallbackUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const allowedOrigins = [
      this.config.get<string>('FRONTEND_URL'),
      this.config.get<string>('ADMIN_FRONTEND_URL'),
      this.config.get<string>('ASTROLOGER_FRONTEND_URL'),
    ]
      .filter((v): v is string => Boolean(v))
      .map((v) => v.replace(/\/+$/, ''));

    const candidate =
      (authData?.redirectUri as string | undefined) ||
      (authData?.redirect_uri as string | undefined) ||
      (req?.query?.redirect_uri as string | undefined);

    if (!candidate) {
      return fallbackUrl;
    }

    try {
      const parsed = new URL(candidate);
      const candidateOrigin = parsed.origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(candidateOrigin)) {
        return `${candidateOrigin}${parsed.pathname || ''}`;
      }
    } catch {
      // Ignore invalid URL and fallback safely
    }

    return fallbackUrl;
  }

  @Get('login')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    return;
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const authData = req.user as any;
    const rawState = req?.query?.state;

    let state: { redirectUrl?: string; redirect_uri?: string; role?: string } = {};

    if (typeof rawState === 'string') {
      try {
        state = JSON.parse(decodeURIComponent(rawState));
      } catch {
        // Ignore invalid state parsing
      }
    }

    if (!authData || !authData.accessToken) {
      const errorBase = state.redirectUrl || state.redirect_uri || this.resolveFrontendUrl(req, authData);
      return res.redirect(`${errorBase}?error=google_auth_failed`);
    }

    // Set cookies
    this.setCookies(authData, res);

    // Determine redirection URL
    let frontendUrl = this.resolveFrontendUrl(req, authData);

    // Prioritize redirectUri passed from strategy (which originally came from state/query)
    const finalRedirectBase = authData.redirectUri || state.redirectUrl || state.redirect_uri;

    if (finalRedirectBase) {
      frontendUrl = finalRedirectBase;
    } else {
      // Role-based fallback only if no redirect URI was provided at all
      const roles = authData.user?.roles || [];
      if (roles.some((r: any) => r.name === 'expert')) {
        frontendUrl = this.config.get<string>('ASTROLOGER_FRONTEND_URL') || 'http://localhost:3003';
      } else if (roles.some((r: any) => r.name === 'admin')) {
        frontendUrl = this.config.get<string>('ADMIN_FRONTEND_URL') || 'http://localhost:3001';
      }
    }

    // Redirect to frontend with tokens in URL (for frontend middleware to pick up)
    const redirectUrl = `${frontendUrl}${frontendUrl.includes('?') ? '&' : '?'}accessToken=${authData.accessToken}&refreshToken=${authData.refreshToken}`;

    return res.redirect(redirectUrl);
  }

  private setCookies(
    tokens: { accessToken?: string; refreshToken?: string },
    res: Response,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
