import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import 'dotenv/config';

@Controller({
  path: 'auth/google',
  version: '1',
})
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);
  constructor(private readonly config: ConfigService) {}

  private resolveFrontendUrl(
    req: Request,
    authData: Record<string, unknown>,
  ): string {
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

    if (
      !candidate ||
      candidate === 'undefined' ||
      candidate.includes('/undefined')
    ) {
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
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    if (res.headersSent) {
      this.logger.log(
        `Headers already sent for ${req.url}, skipping controller logic.`,
      );
      return;
    }
    const authData = req.user as Record<string, unknown>;
    const rawState = req?.query?.state;

    let state: { redirectUrl?: string; redirect_uri?: string; role?: string } =
      {};

    if (typeof rawState === 'string') {
      try {
        state = JSON.parse(decodeURIComponent(rawState)) as typeof state;
      } catch {
        // Ignore invalid state parsing
      }
    }

    if (!authData || !authData.accessToken) {
      const errorBase =
        state.redirectUrl ||
        state.redirect_uri ||
        this.resolveFrontendUrl(req, authData);
      return res.redirect(`${errorBase}?error=google_auth_failed`);
    }

    // Set cookies
    this.setCookies(authData, res);

    // Determine redirection URL
    let frontendUrl = this.resolveFrontendUrl(req, authData);

    // Prioritize redirectUri passed from strategy (which originally came from state/query)
    const finalRedirectBase =
      (authData.redirectUri as string) ||
      state.redirectUrl ||
      state.redirect_uri ||
      '';

    if (
      finalRedirectBase &&
      finalRedirectBase !== 'undefined' &&
      !finalRedirectBase.includes('/undefined')
    ) {
      // Validate that finalRedirectBase is actually an absolute URL
      try {
        if (finalRedirectBase.startsWith('http')) {
          frontendUrl = finalRedirectBase;
        } else {
          // If it's relative, join it with the resolved frontend base
          const baseMatch = frontendUrl.replace(/\/+$/, '');
          const relativePath = finalRedirectBase.startsWith('/')
            ? finalRedirectBase
            : `/${finalRedirectBase}`;
          frontendUrl = `${baseMatch}${relativePath}`;
        }
      } catch {
        // Fallback already set in frontendUrl
      }
    } else {
      // Role-based fallback only if no redirect URI was provided at all
      const roles =
        (authData.user as { roles?: Array<{ name?: string } | string> })
          ?.roles || [];
      const hasRole = (roleName: string) =>
        roles.some(
          (r: { name?: string } | string) =>
            (typeof r === 'string'
              ? r
              : (r as { name?: string })?.name || ''
            ).toLowerCase() === roleName.toLowerCase(),
        );

      if (hasRole('expert')) {
        frontendUrl =
          this.config.get<string>('ASTROLOGER_FRONTEND_URL') ||
          'http://localhost:3003';
      } else if (hasRole('admin')) {
        frontendUrl =
          this.config.get<string>('ADMIN_FRONTEND_URL') ||
          'http://localhost:3001';
      } else if (hasRole('merchant')) {
        frontendUrl =
          this.config.get<string>('MERCHANT_FRONTEND_URL') ||
          'http://localhost:3004';
      }
    }

    // Redirect to frontend with tokens in URL (for frontend middleware to pick up)
    const redirectUrl = `${frontendUrl}${frontendUrl.includes('?') ? '&' : '?'}accessToken=${authData.accessToken as string}&refreshToken=${authData.refreshToken as string}`;

    return res.redirect(redirectUrl);
  }

  private setCookies(
    tokens: { accessToken?: string; refreshToken?: string },
    res: Response,
  ) {
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    };

    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
