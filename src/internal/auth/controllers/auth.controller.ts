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
import { RolesGuard } from '../guards/role.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { AuthService } from '../auth.service';
import { instanceToPlain } from 'class-transformer';
import { JwtAuthRefreshGuard } from '../guards/auth-refresh.guard';
import { RoleEnum } from '../../users/enums/Role.enum';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('email/register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.register(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  @Post('email/register/initiate')
  async initiateEmailRegistration(@Body() dto: InitiateRegisterDto) {
    return this.authService.initiateEmailRegistration(dto);
  }

  @Post('email/register/complete')
  async completeEmailRegistration(
    @Body() dto: CompleteRegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.completeEmailRegistration(
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
    const { user, tokens } = await this.authService.loginWithEmail(
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
    const { user, tokens } = await this.authService.loginWithEmail(
      dto,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  @Get('email/verify')
  confirmEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('email/confirm/new')
  resendConfirmation(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
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
  @Get('refresh')
  @UseGuards(JwtAuthRefreshGuard)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshToken(
      (req as unknown as Record<string, unknown>)['refreshToken'] as string,
    );
    this.setCookies(res, tokens);
    return tokens;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return this.authService.logout(id);
  }

  @Post('magic/new')
  sendMagicLink(@Body() dto: SendMagicLinkDto, @Req() _req: Request) {
    return this.authService.sendMagicLink(dto.email);
  }

  @Get('magic/login')
  async magicLinkLogin(
    @Query('token') token: string,
    @Query('role') role: RoleEnum = RoleEnum.CLIENT,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.loginWithMagicLink(
      token,
      role,
      req.ip,
      req.get('user-agent'),
    );

    this.setCookies(res, tokens);
    return instanceToPlain({ user, ...tokens });
  }

  @Post('agent/register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT')
  async agentRegister(
    @Body() dto: AgentRegisterUserDto,
    @CurrentUser('id') agentId: string,
  ) {
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
