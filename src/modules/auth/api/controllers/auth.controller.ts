import { CookieOptions, Request, Response } from 'express';
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
  Get,
  Res,
} from '@nestjs/common';

import { RegisterDto, LoginDto } from '../dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SendMagicLinkDto,
} from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/auth.guard';
import { AuthFacade } from '../../application/auth.facade';
import { instanceToPlain } from 'class-transformer';
import { JwtAuthRefreshGuard } from '../guards/auth-refresh.guard';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authFacade: AuthFacade) {}

  @Post('email/register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authFacade.register(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  @Post('email/login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authFacade.loginWithEmail(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  // Backward-compatible alias for clients still using /auth/login
  @Post('login')
  async loginAlias(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authFacade.loginWithEmail(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  @Post('email/verify')
  confirmEmail(@Body('token') token: string) {
    return this.authFacade.verifyEmail(token);
  }

  @Post('email/confirm/new')
  resendConfirmation(@Body('email') email: string) {
    return this.authFacade.resendVerificationEmail(email);
  }

  @Post('forgot/password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authFacade.forgotPassword(dto.email);
  }

  @Post('reset/password')
  resetPassword(@Query('token') token: string, @Body() dto: ResetPasswordDto) {
    return this.authFacade.resetPassword(token, dto.password);
  }

  @Get('refresh')
  @UseGuards(JwtAuthRefreshGuard)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authFacade.refreshToken(req['refreshToken']);
    this.setCookies(res, tokens);
    return tokens;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return this.authFacade.logout(id);
  }

  @Post('magic/new')
  sendMagicLink(@Body() dto: SendMagicLinkDto, @Req() req: Request) {
    return this.authFacade.sendMagicLink(dto.email);
  }

  @Get('magic/login')
  async magicLinkLogin(
    @Query('token') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authFacade.loginWithMagicLink(
      token,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  private setCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
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
