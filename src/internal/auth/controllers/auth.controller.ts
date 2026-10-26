import { CookieOptions, type Request, type Response } from 'express';
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
  Get,
  Res,
  Logger,
} from '@nestjs/common';

import { RegisterDto, LoginDto, AgentRegisterUserDto } from '../dto';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SendMagicLinkDto,
} from '../dto/register.dto';
import {
  InitiateRegisterDto,
  CompleteRegisterDto,
} from '../dto/email-register.dto';
import { JwtAuthGuard } from '../guards/auth.guard';
import { JwtLogoutAuthGuard } from '../guards/logout-auth.guard';
import { RolesGuard } from '../guards/role.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { AuthService } from '../auth.service';
import { instanceToPlain } from 'class-transformer';
import { JwtAuthRefreshGuard } from '../guards/auth-refresh.guard';
import { RoleEnum } from '../../users/enums/Role.enum';

/**
 * @deprecated Legacy monolithic auth controller.
 * Migrated to domain-actor specific auth controllers:
 * - Client: `/v1/client/auth/*` (ClientAuthController)
 * - Expert: `/v1/expert/auth/*` (ExpertAuthController)
 * - Merchant: `/v1/merchant/auth/*` (MerchantAuthController)
 */
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * @deprecated Use POST /v1/client/auth/email/register/complete or POST /v1/expert/auth/email/register/complete.
   */
  @Post('email/register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/email/register');
    const { user, tokens } = await this.authService.register(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  /**
   * @deprecated Use POST /v1/client/auth/email/register/initiate or POST /v1/expert/auth/email/register/initiate.
   */
  @Post('email/register/initiate')
  async initiateEmailRegistration(@Body() dto: InitiateRegisterDto) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/email/register/initiate');
    return this.authService.initiateEmailRegistration(dto);
  }

  /**
   * @deprecated Use POST /v1/client/auth/email/register/complete or POST /v1/expert/auth/email/register/complete.
   */
  @Post('email/register/complete')
  async completeEmailRegistration(
    @Body() dto: CompleteRegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/email/register/complete');
    const { user, tokens } = await this.authService.completeEmailRegistration(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  /**
   * @deprecated Use POST /v1/client/auth/email/login or POST /v1/expert/auth/email/login.
   */
  @Post('email/login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/email/login');
    const { user, tokens } = await this.authService.loginWithEmail(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  /**
   * @deprecated Backward-compatible alias. Use POST /v1/client/auth/login or POST /v1/expert/auth/email/login.
   */
  @Post('login')
  async loginAlias(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/login alias');
    const { user, tokens } = await this.authService.loginWithEmail(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  /**
   * @deprecated Use client or expert email verification endpoints.
   */
  @Get('email/verify')
  confirmEmail(@Query('token') token: string) {
    this.logger.warn('[DEPRECATED] Calling legacy GET /auth/email/verify');
    return this.authService.verifyEmail(token);
  }

  /**
   * @deprecated Use actor-specific resend verification endpoints.
   */
  @Post('email/confirm/new')
  resendConfirmation(@Body('email') email: string) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/email/confirm/new');
    return this.authService.resendVerificationEmail(email);
  }

  /**
   * @deprecated Use actor-specific password reset endpoints.
   */
  @Post('forgot/password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/forgot/password');
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * @deprecated Use actor-specific password reset endpoints.
   */
  @Post('reset/password')
  resetPassword(@Query('token') token: string, @Body() dto: ResetPasswordDto) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/reset/password');
    return this.authService.resetPassword(token, dto.password);
  }

  /**
   * @deprecated Use POST /v1/client/auth/refresh or POST /v1/expert/auth/refresh.
   */
  @Post('refresh')
  @Get('refresh')
  @UseGuards(JwtAuthRefreshGuard)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/refresh');
    const tokens = await this.authService.refreshToken(
      (req as unknown as Record<string, unknown>)['refreshToken'] as string,
    );
    this.setCookies(res, tokens);
    return tokens;
  }

  /**
   * @deprecated Use POST /v1/client/auth/logout or POST /v1/expert/auth/logout.
   */
  @Post('logout')
  @Get('logout')
  @UseGuards(JwtLogoutAuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.warn('[DEPRECATED] Calling legacy /auth/logout - migrate to /v1/client/auth/logout or /v1/expert/auth/logout');
    res.clearCookie('accessToken', { path: '/', sameSite: 'none', secure: true });
    res.clearCookie('refreshToken', { path: '/', sameSite: 'none', secure: true });

    const user = (req as unknown as Record<string, unknown>)['user'] as { id?: string } | undefined;
    if (user?.id) {
      try {
        await this.authService.logout(user.id);
      } catch (err) {
        this.logger.warn(`Failed to revoke session during legacy logout: ${err}`);
      }
    }

    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * @deprecated Magic link authentication is scheduled for deprecation.
   */
  @Post('magic/new')
  sendMagicLink(@Body() dto: SendMagicLinkDto, @Req() _req: Request) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/magic/new');
    return this.authService.sendMagicLink(dto.email);
  }

  /**
   * @deprecated Magic link authentication is scheduled for deprecation.
   */
  @Get('magic/login')
  async magicLinkLogin(
    @Query('token') token: string,
    @Query('role') role: RoleEnum = RoleEnum.CLIENT,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.warn('[DEPRECATED] Calling legacy GET /auth/magic/login');
    const { user, tokens } = await this.authService.loginWithMagicLink(
      token,
      role,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  /**
   * @deprecated Use agent-specific endpoints.
   */
  @Post('agent/register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT')
  async agentRegister(
    @Body() dto: AgentRegisterUserDto,
    @CurrentUser('id') agentId: string,
  ) {
    this.logger.warn('[DEPRECATED] Calling legacy POST /auth/agent/register');
    return this.authService.agentRegister(dto, agentId);
  }

  private setCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true, // Must be true for sameSite: 'none'
      sameSite: 'none', // Allows cross-site cookie usage
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
