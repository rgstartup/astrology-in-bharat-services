import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  // Patch,
  // Delete,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import {
  RegisterDto,
  LoginDto,
  //   OAuthUserDto,
  RefreshTokenDto,
  //   ForgotPasswordDto,
  //   ResetPasswordDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Request } from 'express';
import { TokenService } from './services/token.service';
// import { OAuthUserDto } from './dto/oauth-user.dto';
import { AuthGuard } from '@nestjs/passport';

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
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip, req.get('user-agent'));
  }

  @Post('email/login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip, req.get('user-agent'));
  }

  // @Post('email/confirm')
  // confirmEmail(@Body() dto: { token: string }) {
  //   return this.authService.confirmEmail(dto.token);
  // }

  // @Post('email/confirm/new')
  // resendConfirmation(@Body() dto: { email: string }) {
  //   return this.authService.resendConfirmation(dto.email);
  // }

  // @Post('forgot/password')
  // forgotPassword(@Body() dto: ForgotPasswordDto) {
  //   return this.authService.forgotPassword(dto.email);
  // }

  // @Post('reset/password')
  // resetPassword(@Body() dto: ResetPasswordDto) {
  //   return this.authService.resetPassword(dto.token, dto.newPassword);
  // }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return user;
  }

  // @Patch('me')
  // @UseGuards(JwtAuthGuard)
  // updateMe(@CurrentUser('id') id: string, @Body() dto: any) {
  //   return this.authService.updateMe(id, dto);
  // }

  // @Delete('me')
  // @UseGuards(JwtAuthGuard)
  // deleteMe(@CurrentUser('id') id: string) {
  //   return this.authService.deleteMe(id);
  // }

  @Post('refresh')
  refresh(@CurrentUser('id') id: number, @Body() dto: RefreshTokenDto) {
    return this.tokenService.refreshTokens(id, dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser('id') id: number) {
    console.log({ id });
    return this.authService.logout(id);
  }

  // @Post('google/login')
  // googleLogin(@Body() dto: OAuthUserDto, @Req() req: Request) {
  //   return this.authService.oauthLogin(dto, req.ip, req.get('user-agent'));
  // }
}
