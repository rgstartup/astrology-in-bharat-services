import {
  BadRequestException,
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import 'dotenv/config';

@Controller({
  path: 'auth/google',
  version: '1',
})
export class GoogleAuthController {
  @Get('login')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    return;
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const rawState = req?.query?.state;

    if (typeof rawState !== 'string') {
      throw new BadRequestException('Missing Google state');
    }

    let state: { redirectUrl?: string };

    try {
      state = JSON.parse(decodeURIComponent(rawState));
    } catch {
      throw new BadRequestException('Invalid Google state');
    }

    state.redirectUrl = state.redirectUrl || process.env.FRONTEND_URL!;

    const redirectUrl = new URL(state.redirectUrl);

    const tokens = req.user as
      | { accessToken?: string; refreshToken?: string }
      | undefined;

    if (!tokens?.accessToken || !tokens?.refreshToken) {
      return res.redirect(`${state.redirectUrl}?error=google_auth_failed`);
    }

    this.setCookies(tokens, res);

    return res.redirect(redirectUrl.toString());
  }

  private setCookies(
    tokens: { accessToken?: string; refreshToken?: string },
    res: Response,
  ) {
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
