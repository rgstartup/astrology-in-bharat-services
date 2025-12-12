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
  Res, // 👈 added
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
  register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response, // 👈 pass Response
  ) {
    return this.authService.register(
      dto,
      req.ip,
      req.get('user-agent') || undefined,
      res, // 👈 send to service (so it can set cookies)
    );
  }

  @Post('email/login')
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response, // 👈 pass Response
  ) {
    return this.authService.login(
      dto,
      req.ip,
      req.get('user-agent') || undefined,
      res, // 👈 send to service (so it can set cookies)
    );
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
  //  @UseGuards(JwtAuthGuard)
  refresh(@CurrentUser('id') id: number, @Req() req: Request) {
    const refreshToken = req.cookies?.refreshToken; // cookie name: refreshToken
    return this.tokenService.refreshTokens(id, refreshToken);
  }


  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser('id') id: number) {
    return this.authService.logout(id);
    // if you later add cookie clearing in AuthService.logout, you can also inject @Res here
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
