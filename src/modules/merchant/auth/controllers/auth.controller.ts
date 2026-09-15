import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { MerchantJwtRefreshAuthGuard } from '../guards/refresh-auth.guard';
import { MerchantAuthFacade } from '../auth.facade';
import { MerchantLoginDto } from '../dto/merchant-login.dto';
import {
  CompleteMerchantRegisterDto,
  InitiateMerchantRegisterDto,
} from '../dto/merchant-register.dto';

type RefreshTokenRequest = Request & { refreshToken: string };

@Controller({ path: 'merchant/auth', version: '1' })
export class MerchantAuthController {
  constructor(private readonly authFacade: MerchantAuthFacade) {}

  @Post('email/register/initiate')
  initiate(@Body() dto: InitiateMerchantRegisterDto) {
    return this.authFacade.initiateEmailRegistration(dto);
  }

  @Post('email/register/complete')
  async complete(
    @Body() dto: CompleteMerchantRegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authFacade.completeEmailRegistration(
      dto,
      req.ip,
      req.get('user-agent'),
    );
    this.setCookies(res, result);
    return result;
  }

  @Post('email/login')
  async login(
    @Body() dto: MerchantLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authFacade.loginWithEmail(
      dto,
      req.ip,
      req.get('user-agent'),
    );
    this.setCookies(res, result);
    return result;
  }

  @Post('refresh')
  @UseGuards(MerchantJwtRefreshAuthGuard)
  async refresh(
    @Req() req: RefreshTokenRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authFacade.refreshToken(req.refreshToken);
    this.setCookies(res, tokens);
    return tokens;
  }

  private setCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const options: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    };
    res.cookie('accessToken', tokens.accessToken, {
      ...options,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      ...options,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
