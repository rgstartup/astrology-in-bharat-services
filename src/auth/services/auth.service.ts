import * as argon2 from 'argon2';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { TokenService } from './token.service';
import { RegisterDto, LoginDto } from '../dto';
import { OAuthUserDto } from '../dto/oauth-user.dto';
import { OAuthService } from './oauth.service';
import { DatabaseService } from 'src/core/database/database.service';
import { instanceToPlain } from 'class-transformer';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  UserRegisteredEvent,
  ConfirmEmailEvent,
  ResetPasswordEvent,
  SendMagicLinkEvent,
} from '@/notification/events/user.event';
import { JsonWebTokenError } from '@nestjs/jwt';
import { UsedTokensService } from './used-tokens.service';

// 👇 ADD THIS
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tokenService: TokenService,
    private oauthService: OAuthService,
    private usedTokenService: UsedTokensService,
    private db: DatabaseService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------
  // REGISTER with cookies service
  // ---------------------------
  async register(
    dto: RegisterDto,
    ip?: string,
    userAgent?: string,
    res?: Response, // 👈 get Response from controller
  ) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new BadRequestException('Email already exists!');
    }

    const hashed = await argon2.hash(dto.password, { type: argon2.argon2id });

    const { roles, ...registerDto } = dto;

    const formattedRoles = roles.map((r) => ({
      name: r,
    }));

    // 👇 return user + tokens from transaction
    const { user, tokens } = await this.db.transaction(async (queryRunner) => {
      const user = await this.usersService.create(
        { ...registerDto, roles: formattedRoles, password: hashed },
        queryRunner,
      );

      const tokens = await this.tokenService.generateTokens(
        user,
        ip,
        userAgent,
        queryRunner,
      );

      const verification_token = this.tokenService.generate5MinToken({
        sub: user.id,
        email: user.email,
      });

      // send email notification
      this.eventEmitter.emit(
        'user:register',
        new UserRegisteredEvent(
          user.id,
          user.email,
          user.name,
          verification_token,
        ),
      );

      return { user, tokens };
    });

    // 👇 set cookies (if Response passed)
    if (res) {
      this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    }

    // you can still return the user (tokens not needed on frontend)
    return instanceToPlain({ user });
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.password, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  // ---------------------------
  // LOGIN with cookies
  // ---------------------------
  async login(
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
    res?: Response, // 👈 get Response from controller
  ) {
    const user = await this.validateUser(dto.email, dto.password);
    const tokens = await this.tokenService.generateTokens(user, ip, userAgent);

    if (res) {
      this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    }

    // just return user, tokens are already in cookies
    return instanceToPlain({ user });
  }

  async oauthLogin(dto: OAuthUserDto, ip?: string, userAgent?: string) {
    const user = await this.oauthService.findOrCreateUserFromOAuth(dto);
    const tokens = await this.tokenService.generateTokens(user, ip, userAgent);

    return { user, ...tokens }; // (you can also move this to cookies later)
  }

  async logout(id: number) {
    await this.tokenService.revoke(id);
  }

  async confirmEmail(token: string) {
    try {
      const payload = await this.tokenService.verifyToken(token);

      const userToConfirm = await this.usersService.findByEmail(payload.email);

      if (!userToConfirm) {
        throw new UnauthorizedException('User not found');
      }

      await this.checkTokenUsed(token, userToConfirm.id);

      if (userToConfirm.emailVerified) {
        return {
          message: 'Email already verified',
        };
      }

      await this.usersService.update(userToConfirm.id, {
        emailVerified: true,
      });

      await this.usedTokenService.addUsedToken(
        token,
        userToConfirm.id,
        'email confirmation',
      );

      return {
        message: 'Email verified successfully',
      };
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new BadRequestException('Invalid or expired token');
      }

      throw error;
    }
  }

  async resendConfirmationEamil(email: string) {
    const existingUser = await this.usersService.findByEmail(email);

    if (!existingUser) {
      throw new BadRequestException("User not found or doesn't exist");
    }

    const verification_token = this.tokenService.generate5MinToken({
      sub: existingUser.id,
      email: existingUser.email,
    });

    this.eventEmitter.emit(
      'user:confirm',
      new ConfirmEmailEvent(existingUser.email, verification_token),
    );

    return {
      message: 'Confirmation email sent!',
    };
  }

  async forgotPassword(email: string) {
    const existingUser = await this.usersService.findByEmail(email);

    if (!existingUser) {
      throw new BadRequestException("User not found or doesn't exist");
    }

    const reset_password_token = this.tokenService.generate5MinToken({
      sub: existingUser.id,
      email: existingUser.email,
    });

    this.eventEmitter.emit(
      'user:reset-password',
      new ResetPasswordEvent(existingUser.email, reset_password_token),
    );

    return {
      message: 'Password reset link sent!',
    };
  }

  async resetPassword(token: string, password: string) {
    try {
      const payload = await this.tokenService.verifyToken(token);

      const existingUser = await this.usersService.findByEmail(payload.email);

      if (!existingUser) {
        throw new BadRequestException("User not found or doesn't exist");
      }

      await this.checkTokenUsed(token, existingUser.id);

      const hashed = await argon2.hash(password, { type: argon2.argon2id });

      await this.usersService.update(existingUser.id, {
        password: hashed,
      });

      await this.usedTokenService.addUsedToken(
        token,
        existingUser.id,
        'password reset',
      );

      return {
        message: 'Password updated successfully!',
      };
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new BadRequestException('Invalid or expired token');
      }

      throw error;
    }
  }

  async sendMagicLink(email: string) {
    const existingUser = await this.usersService.findByEmail(email);

    if (!existingUser) {
      throw new BadRequestException("User not found or doesn't exist");
    }

    const token = this.tokenService.generate5MinToken({
      sub: existingUser.id,
      email: existingUser.email,
    });

    this.eventEmitter.emit(
      'user:magic-link',
      new SendMagicLinkEvent(existingUser.email, token),
    );

    return {
      message: 'Magic link sent successfully!',
    };
  }

  async magicLinkLogin(token: string, ip?: string, userAgent?: string) {
    try {
      const payload = await this.tokenService.verifyToken(token);

      const user = await this.usersService.findByEmail(payload.email);

      if (!user) {
        throw new UnauthorizedException("User not found or doesn't exist");
      }

      await this.checkTokenUsed(token, user.id);

      const tokens = await this.tokenService.generateTokens(
        user,
        ip,
        userAgent,
      );

      await this.usedTokenService.addUsedToken(
        token,
        user.id,
        'magic link login',
      );

      return instanceToPlain({ user, ...tokens });
      // 👉 you can also switch this to cookies later if you want
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new BadRequestException('Invalid or expired token');
      }

      throw error;
    }
  }

  async checkTokenUsed(token: string, userId: number) {
    const usedToken = await this.usedTokenService.findOne(token, userId);

    if (!usedToken) return;

    throw new BadRequestException('Token already used');
  }

  // ---------------------------
  // NEW: cookie helper
  // ---------------------------
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
