import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { GoogleAuthGuard } from '../guards/google-auth.guard';

@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly authService: AuthService) { }

  // --- CLIENT GOOGLE AUTH ---
  @Get('client')
  @UseGuards(GoogleAuthGuard)
  async clientAuth() {
    // triggers google strategy (handled by passport)
  }

  @Get('client/callback')
  @UseGuards(GoogleAuthGuard)
  async clientAuthCallback(@Req() req: Request, @Res() res: Response) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const user: any = req.user;
    const result = await this.authService.oauthLogin(
      {
        provider: 'google',
        providerId: user.id,
        email: user.emails[0].value,
        name: user.displayName,
        roles: ['client'],
        profile: user,
      },
      ip,
      userAgent,
    );

    // Set tokens in cookies
    this.authService.setRefreshTokenCookie(res, result.refreshToken);
    this.authService.setAccessTokenCookie(res, result.accessToken);

    // Redirect to client dashboard
    return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }

  // --- EXPERT GOOGLE AUTH ---
  @Get('expert')
  @UseGuards(GoogleAuthGuard)
  async expertAuth() {
    // triggers google strategy
  }

  @Get('expert/callback')
  @UseGuards(GoogleAuthGuard)
  async expertAuthCallback(@Req() req: Request, @Res() res: Response) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const user: any = req.user;
    const result = await this.authService.oauthLogin(
      {
        provider: 'google',
        providerId: user.id,
        email: user.emails[0].value,
        name: user.displayName,
        roles: ['expert'],
        profile: user,
      },
      ip,
      userAgent,
    );

    // Set tokens in cookies
    this.authService.setRefreshTokenCookie(res, result.refreshToken);
    this.authService.setAccessTokenCookie(res, result.accessToken);

    // Redirect to expert dashboard
    return res.redirect(`${process.env.EXPERT_URL}/dashboard`);
  }
}
