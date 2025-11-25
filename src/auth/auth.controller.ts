import { Request, Response } from 'express';
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  Query,
  Get,
} from '@nestjs/common';

import { AuthService } from './services/auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TokenService } from './services/token.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SendMagicLinkDto,
} from './dto/register.dto';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  COOKIE_NAMES,
} from './helpers/cookie.helper';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('email/register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    // Set tokens as HttpOnly secure cookies
    res.cookie(
      COOKIE_NAMES.ACCESS_TOKEN,
      result.accessToken,
      getAccessTokenCookieOptions(),
    );
    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      result.refreshToken,
      getRefreshTokenCookieOptions(),
    );

    return result;
  }

  @Post('email/login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    // Set tokens as HttpOnly secure cookies
    res.cookie(
      COOKIE_NAMES.ACCESS_TOKEN,
      result.accessToken,
      getAccessTokenCookieOptions(),
    );
    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      result.refreshToken,
      getRefreshTokenCookieOptions(),
    );

    return result;
  }

  @Post('email/confirm')
  confirmEmail(@Body() dto: { token: string }) {
    return this.authService.confirmEmail(dto.token);
  }

  @Post('email/confirm/new')
  resendConfirmation(@Body() dto: { email: string }) {
    return this.authService.resendConfirmationEamil(dto.email);
  }

  @Post('forgot/password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset/password')
  resetPassword(@Query('token') token: string, @Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(token, dto.password);
  }

  @Post('refresh')
  async refresh(
    @CurrentUser('id') id: number,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.tokenService.refreshTokens(id, dto.refreshToken);

    // Set new tokens as HttpOnly secure cookies
    res.cookie(
      COOKIE_NAMES.ACCESS_TOKEN,
      result.accessToken,
      getAccessTokenCookieOptions(),
    );
    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      result.refreshToken,
      getRefreshTokenCookieOptions(),
    );

    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(id);

    // Clear cookies on logout
    res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN);
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN);

    return { message: 'Logged out successfully' };
  }

  @Post('magic/new')
  sendMagicLink(@Body() dto: SendMagicLinkDto, @Req() req: Request) {
    return this.authService.sendMagicLink(dto.email);
  }

  @Get('magic/login')
  async magicLinkLogin(
    @Query('token') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.magicLinkLogin(
      token,
      req.ip,
      req.get('user-agent'),
    );

    // Set tokens as HttpOnly secure cookies
    res.cookie(
      COOKIE_NAMES.ACCESS_TOKEN,
      result.accessToken,
      getAccessTokenCookieOptions(),
    );
    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      result.refreshToken,
      getRefreshTokenCookieOptions(),
    );

    return result;
  }
}
