import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '@/modules/auth/application/services/auth.service';
import { GoogleAuthGuard } from '../guards/google-auth.guard';

@Controller({
  path: 'auth/google',
  version: '1',
})
export class GoogleAuthController {
  constructor(private readonly authService: AuthService) { }

  @Get('login')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // triggers google strategy
  }

  @Get('callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user: any = req.user;

    // The user object returned by strategy contains 'user' (entity) and 'tokens'
    // It's mapped in GoogleStrategy done(null, { ...user, ...tokens })

    const refreshToken = user.refreshToken;
    const accessToken = user.accessToken;

    // Set tokens in cookies
    this.authService.setRefreshTokenCookie(res, refreshToken);
    this.authService.setAccessTokenCookie(res, accessToken);

    // Parse state for redirect
    let redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      if (req.query.state) {
        const state = JSON.parse(req.query.state as string);
        if (state.redirect_uri) {
          redirectUrl = state.redirect_uri;
        } else if (state.role === 'expert') {
          redirectUrl = process.env.EXPERT_URL || 'http://localhost:3003';
        } else if (state.role === 'admin') {
          redirectUrl = process.env.ADMIN_URL || 'http://localhost:3001';
        }
      }
    } catch (e) {
      console.error('Error parsing state in callback:', e);
    }

    // Redirect to frontend
    return res.redirect(`${redirectUrl}/dashboard?token=${accessToken}`);
  }

  // Fallback for old endpoints if needed
  @Get('client')
  @UseGuards(GoogleAuthGuard)
  async clientAuth() { }

  @Get('expert')
  @UseGuards(GoogleAuthGuard)
  async expertAuth() { }
}
