import { Controller, Get, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
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

    if (!authData || !authData.accessToken) {
      let errorRedirect = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      // Try to get redirectUrl from state if tokens failed
      try {
        const rawState = req?.query?.state as string;
        if (rawState) {
          const state = JSON.parse(decodeURIComponent(rawState));
          if (state.redirect_uri || state.redirectUrl) {
            errorRedirect = state.redirect_uri || state.redirectUrl;
          }
        }
      } catch (e) {
        // ignore parsing error
      }
      return res.redirect(`${errorRedirect}?error=google_auth_failed`);
    }

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

    // 1. Check if a specific redirect_uri was provided by the frontend (passed through strategy)
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
    const redirectUrl = `${frontendUrl}${frontendUrl.includes('?') ? '&' : '?'}accessToken=${authData.accessToken}&refreshToken=${authData.refreshToken}`;
    return res.redirect(redirectUrl);
  }
}
