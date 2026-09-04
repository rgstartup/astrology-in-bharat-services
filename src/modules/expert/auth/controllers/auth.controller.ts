import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { ExpertJwtRefreshAuthGuard } from '../guards/refresh-auth.guard';
import { ExpertAuthFacade } from '../auth.facade';
import { ExpertLoginDto } from '../dto/expert-login.dto';
import {
  CompleteExpertRegisterDto,
  InitiateExpertRegisterDto,
} from '../dto/expert-register.dto';

type RefreshTokenRequest = Request & { refreshToken: string };

@Controller({ path: 'auth/expert', version: '1' })
export class ExpertAuthController {
  constructor(private readonly authFacade: ExpertAuthFacade) {}

  @Post('email/register/initiate')
  initiate(@Body() dto: InitiateExpertRegisterDto) {
    return this.authFacade.initiateEmailRegistration(dto);
  }

  @Post('email/register/complete')
  async complete(
    @Body() dto: CompleteExpertRegisterDto,
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
    @Body() dto: ExpertLoginDto,
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
  @UseGuards(ExpertJwtRefreshAuthGuard)
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
