import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { GoogleAuthGuard } from '../guards/google-auth.guard';

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
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const authData = req.user as any;
    const frontendUrl = this.resolveFrontendUrl(req, authData);

    if (authData && authData.accessToken) {
      const isProduction = process.env.NODE_ENV === 'production';

      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
      };

      // Set HttpOnly cookies
      res.cookie('accessToken', authData.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', authData.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Redirect to frontend with tokens in URL (for frontend middleware to pick up)
      const redirectUrl = `${frontendUrl}?accessToken=${authData.accessToken}&refreshToken=${authData.refreshToken}`;
      return res.redirect(redirectUrl);
    }

    // If no tokens, redirect to frontend with error
    return res.redirect(`${frontendUrl}?error=google_auth_failed`);
  }
}
