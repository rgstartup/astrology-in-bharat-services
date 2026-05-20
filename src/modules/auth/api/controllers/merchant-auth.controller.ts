import { CookieOptions, Request, Response } from 'express';
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  Get,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { MerchantRegisterDto } from '../dto/merchant-register.dto';
import { MerchantLoginDto } from '../dto/merchant-login.dto';
import { AuthFacade } from '../../application/auth.facade';
import { JwtAuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Controller({
  path: 'auth/merchant',
  version: '1',
})
export class MerchantAuthController {
  private readonly logger = new Logger(MerchantAuthController.name);
  constructor(private readonly authFacade: AuthFacade) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: MerchantRegisterDto, @Req() req: Request) {
    try {
      const data = await this.authFacade.merchantRegister(
        dto,
        req.ip,
        req.get('user-agent'),
      );

      return {
        success: true,
        message: 'Merchant account created successfully. Please verify your email.',
        data,
      };
    } catch (error) {
      
      this.logger.error(`Merchant registration failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: MerchantLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { user, tokens } = await this.authFacade.loginWithEmail(
        dto,
        req.ip,
        req.get('user-agent'),
      );

      // Verify the user is actually a merchant
      const roles = user.roles || [];
      if (!roles.includes(RoleEnum.MERCHANT)) {
        throw new ForbiddenException('Only merchant accounts can login here.');
      }

      this.setCookies(res, tokens);

      return {
        success: true,
        message: 'Login successful',
        token: tokens.accessToken,
        user: {
          merchantId: user.uid || user.id.toString(),
          shopName: user.profile_merchant?.shopName || user.name,
          email: user.email,
          roles: user.roles
        },
      };
    } catch (error) {
      this.logger.error(`Merchant login failed: ${error.message}`);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException(error.message || 'Invalid credentials');
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser('id') userId: number) {
    try {
      const profile = await this.authFacade.getMerchantProfile(userId);
      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      await this.authFacade.logout(userId);
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    try {
      if (!email) {
        return { success: false, error: 'Email is required' };
      }
      await this.authFacade.forgotPassword(email);
      return {
        success: true,
        message: 'Password reset link sent successfully.',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
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
