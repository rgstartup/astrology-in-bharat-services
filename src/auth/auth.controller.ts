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
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './services/auth.service';
import { RegisterDto, LoginDto } from './dto';
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
    private readonly jwtService: JwtService,
  ) { }

  // ... (previous methods unchanged)

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
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenCookie = (req.cookies as { refreshToken?: string } | undefined)
      ?.refreshToken;

    if (!refreshTokenCookie) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    let userId: number;
    let refreshToken: string;

    // Check if token is in new composite format: "userId.secret"
    if (refreshTokenCookie.includes('.')) {
      const parts = refreshTokenCookie.split('.');
      if (parts.length !== 2) {
        throw new UnauthorizedException('Invalid refresh token format');
      }
      userId = parseInt(parts[0], 10);
      refreshToken = parts[1];

      if (isNaN(userId)) {
        throw new UnauthorizedException('Invalid user ID in refresh token');
      }
    } else {
      // Fallback for logic where we might have the user ID from other sources,
      // but without access token, we can't guess it. 
      // Legacy tokens: We can't support them for silent refresh without user context.
      // So we throw. 
      // (Unless we want to try to use the "access token from header" logic as a secondary fallback?
      //  But that logic is complex and redundant if we move forward with composite tokens).
      throw new UnauthorizedException('Legacy refresh token cannot be used for silent refresh. Please login again.');
    }

    const tokens = await this.tokenService.refreshTokens(userId, refreshToken);

    // Set new refresh token in cookie (this will be the NEW composite token because we updated tokenService.generateTokens)
    this.authService.setRefreshTokenCookie(res, tokens.refreshToken);

    // Return access token in body
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, getRefreshTokenCookieOptions());
    return this.authService.logout(id);
  }

  @Post('magic/new')
  sendMagicLink(@Body() dto: SendMagicLinkDto) {
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

    // ONLY set refresh token as HttpOnly secure cookie
    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      result.refreshToken,
      getRefreshTokenCookieOptions(),
    );

    // Access token is returned in the body (result)
    return result;
  }
}
