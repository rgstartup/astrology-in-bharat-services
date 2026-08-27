import { CookieOptions, Request, Response } from 'express';
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  InitiateClientRegisterDto,
  CompleteClientRegisterDto,
} from '../dto/client-register.dto';
import { ClientAuthFacade } from '../auth.facade';
import { ClientLoginDto } from '../dto/client-login.dto';
import { ClientGoogleAuthGuard } from '../guards/google-auth.guard';
import { ClientGoogleAuthResult } from '../strategies/google-auth.strategy';
import { ClientJwtRefreshAuthGuard } from '../guards/refresh-auth.guard';

@Controller({
  path: 'auth/client',
  version: '1',
})
export class ClientAuthController {
  constructor(private readonly clientAuthFacade: ClientAuthFacade) { }

  @Post('email/register/initiate')
  async initiateEmailRegistration(@Body() dto: InitiateClientRegisterDto) {
    return this.clientAuthFacade.initiateEmailRegistration(dto);
  }

  @Post('email/register/complete')
  async completeEmailRegistration(
    @Body() dto: CompleteClientRegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.clientAuthFacade.completeEmailRegistration(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return tokens;
  }

  @Post('email/login')
  async login(
    @Body() dto: ClientLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.clientAuthFacade.loginWithEmail(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return tokens;
  }

  @Get('google/login')
  @UseGuards(ClientGoogleAuthGuard)
  googleLogin() {
    return;
  }

  @Get('google/callback')
  @UseGuards(ClientGoogleAuthGuard)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const authData = req.user as ClientGoogleAuthResult;

    if (!authData || !authData.tokens) {
      const errorBase = authData?.redirect_uri;
      return res.redirect(`${errorBase}?error=google_auth_failed`);
    }

    this.setCookies(res, authData.tokens);

    return res.redirect(authData.redirect_uri!);
  }

  @Post('refresh')
  @Get('refresh')
  @UseGuards(ClientJwtRefreshAuthGuard)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req as unknown as Record<string, unknown>)[
      'refreshToken'
    ] as string;

    const tokens = await this.clientAuthFacade.refreshToken(
      refreshToken,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return tokens;
  }

  private setCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    };

    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 min
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
