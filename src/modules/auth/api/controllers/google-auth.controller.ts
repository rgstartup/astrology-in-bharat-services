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

@Controller({
  path: 'auth/google',
  version: '1',
})
export class GoogleAuthController {
  constructor(private readonly config: ConfigService) {}

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

    if (!state?.redirectUrl) {
      throw new BadRequestException('Missing redirect URL in Google state');
    }

    const tokens = req.user as
      | { accessToken?: string; refreshToken?: string }
      | undefined;

    if (!tokens?.accessToken || !tokens?.refreshToken) {
      throw new BadRequestException('Missing Google auth tokens');
    }

    const redirectUrl = new URL(state.redirectUrl);
    redirectUrl.searchParams.set('accessToken', tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);

    return res.redirect(redirectUrl.toString());
  }
}
