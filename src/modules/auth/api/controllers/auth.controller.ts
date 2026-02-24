import { Request } from 'express';
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
  Get,
} from '@nestjs/common';

import { RegisterDto, LoginDto } from '../dto';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SendMagicLinkDto,
} from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/auth.guard';
import { AuthFacade } from '../../application/auth.facade';
import { JwtAuthRefreshGuard } from '../guards/auth-refresh.guard';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authFacade: AuthFacade) {}

  @Post('email/register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const tokens = await this.authFacade.register(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    return tokens;
  }

  @Post('email/login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const tokens = await this.authFacade.loginWithEmail(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    return tokens;
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
  refresh(@Req() req: Request) {
    return this.authFacade.refreshToken(req['refreshToken']!);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser('id') id: number) {
    return this.authFacade.logout(id);
  }

  @Post('magic/new')
  sendMagicLink(@Body() dto: SendMagicLinkDto, @Req() req: Request) {
    return this.authFacade.sendMagicLink(dto.email);
  }

  @Get('magic/login')
  async magicLinkLogin(@Query('token') token: string, @Req() req: Request) {
    const tokens = await this.authFacade.loginWithMagicLink(
      token,
      req.ip,
      req.get('user-agent'),
    );

    return tokens;
  }
}
