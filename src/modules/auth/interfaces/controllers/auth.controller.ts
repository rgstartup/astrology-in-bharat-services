import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../../application/services/auth.service';
import { RegisterDto, LoginDto } from '../../application/dtos';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, ip, userAgent, res);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ip, userAgent, res);
  }

  // 🔹 Generic client registration
  @Post('client/register')
  async clientRegister(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.clientRegister(dto, ip, userAgent, res);
  }

  // 🔹 Generic client login
  @Post('client/login')
  async clientLogin(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.clientLogin(dto, ip, userAgent, res);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Post('client/logout')
  @UseGuards(JwtAuthGuard)
  async clientLogout(@CurrentUser() user: User) {
    return this.authService.clientLogout(user.id);
  }

  @Get('confirm-email')
  async confirmEmail(@Query('token') token: string) {
    return this.authService.confirmEmail(token);
  }

  @Post('resend-confirmation-email')
  async resendConfirmationEmail(@Body('email') email: string) {
    return this.authService.resendConfirmationEamil(email);
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email: string,
    @Req() req: Request,
  ) {
    // In many cases, password reset link origin comes from headers/config but here we can pass from req
    const origin = req.headers.origin;
    return this.authService.forgotPassword(email, origin);
  }

  @Post('reset-password')
  async resetPassword(
    @Query('token') token: string,
    @Body('password') password: any,
  ) {
    return this.authService.resetPassword(token, password);
  }

  @Post('send-magic-link')
  async sendMagicLink(@Body('email') email: string) {
    return this.authService.sendMagicLink(email);
  }

  @Get('magic-link-login')
  async magicLinkLogin(
    @Query('token') token: string,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.magicLinkLogin(token, ip, userAgent);
  }

  @Get('verify-ip')
  async verifyIp(
    @Query('token') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.verifyIp(token, ip, userAgent, res);
  }
}

