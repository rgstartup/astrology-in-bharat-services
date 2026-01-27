import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from 'src/core/config/auth.config';

@Controller({
  path: 'auth/google',
  version: '1',
})
export class GoogleAuthController {
  constructor(private configService: ConfigService) {}

  @Get('login')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    return;
  }

  @Get('callback')
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const authConfig = this.configService.get<AuthConfig>('auth');
    const { user, accessToken, refreshToken } = req.user as any;

    let state: any = {};
    try {
      state = req.query.state ? JSON.parse(req.query.state as string) : {};
    } catch (e) {
      console.error('Failed to parse OAuth state:', e);
    }

    const requestedRedirectUri = state.redirect_uri;
    const isExpert = user.roles.some((r: any) =>
      typeof r === 'string' ? r === 'expert' : r.name === 'expert',
    );

    // Default frontend URL based on role
    let targetUrl = isExpert
      ? authConfig?.astrologerFrontendUrl
      : authConfig?.frontendUrl;

    // 🔹 Security: Validate requestedRedirectUri if provided
    if (requestedRedirectUri) {
      const allowedOrigins = [
        authConfig?.frontendUrl,
        authConfig?.astrologerFrontendUrl,
        authConfig?.adminFrontendUrl,
      ]
        .filter(Boolean)
        .map((url) => new URL(url as string).origin);

      try {
        const url = new URL(requestedRedirectUri);
        if (allowedOrigins.includes(url.origin)) {
          targetUrl = requestedRedirectUri;
        } else {
          console.warn(
            `Blocked redirect to unauthorized origin: ${url.origin}`,
          );
        }
      } catch (e) {
        console.error('Invalid redirect_uri format:', requestedRedirectUri);
      }
    }

    // 🔹 Set accessToken in HTTP-only cookie for JwtStrategy
    res.cookie('accessToken', accessToken, {
      httpOnly: false, // Set to false if frontend needs to read it, but JwtStrategy uses it from req.cookies
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes (match JWT expiry)
    });

    // Redirect to frontend with tokens
    const redirectUrl = new URL(targetUrl || 'http://localhost:3000');
    redirectUrl.searchParams.set('accessToken', accessToken);
    redirectUrl.searchParams.set('refreshToken', refreshToken);

    return res.redirect(redirectUrl.toString());
  }
}
