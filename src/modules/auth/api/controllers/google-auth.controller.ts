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

      // Determine redirection URL
      let frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

      // 1. Check if a specific redirect_uri was provided by the frontend
      if (authData.redirectUri) {
        frontendUrl = authData.redirectUri;
      }
      // 2. Otherwise, check user role for dashboard redirection
      else if (authData.user?.roles?.some((r: any) => r.name === 'expert')) {
        frontendUrl = this.config.get<string>('ASTROLOGER_FRONTEND_URL') || 'http://localhost:3003';
      }
      else if (authData.user?.roles?.some((r: any) => r.name === 'admin')) {
        frontendUrl = this.config.get<string>('ADMIN_FRONTEND_URL') || 'http://localhost:3001';
      }

      // Redirect to frontend with tokens in URL (for frontend middleware to pick up)
      const redirectUrl = `${frontendUrl}?accessToken=${authData.accessToken}&refreshToken=${authData.refreshToken}`;
      return res.redirect(redirectUrl);
    }

    const defaultFrontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    // If no tokens, redirect to frontend with error
    return res.redirect(`${defaultFrontendUrl}?error=google_auth_failed`);
  }
}
