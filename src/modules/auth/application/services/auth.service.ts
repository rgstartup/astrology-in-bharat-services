import * as argon2 from 'argon2';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '@/modules/users';
import { TokenService } from './token.service';
import { RegisterDto, LoginDto } from '../dtos';
import { OAuthUserDto } from '../dtos/oauth-user.dto';
import { OAuthService } from './oauth.service';
import { DatabaseService } from 'src/core/database/database.service';
import { instanceToPlain } from 'class-transformer';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  UserRegisteredEvent,
  ConfirmEmailEvent,
  ResetPasswordEvent,
  SendMagicLinkEvent,
  VerifyIpEvent,
} from '@/modules/notification/application/events/user.event';
import { JsonWebTokenError } from '@nestjs/jwt';
import { UsedTokensService } from './used-tokens.service';

import { Response } from 'express';
import {
  COOKIE_NAMES,
  getRefreshTokenCookieOptions,
  getAccessTokenCookieOptions,
} from '../helpers/cookie.helper';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tokenService: TokenService,
    private oauthService: OAuthService,
    private usedTokenService: UsedTokensService,
    private db: DatabaseService,
    private eventEmitter: EventEmitter2,
  ) { }

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

    const { roles = ['client'], phone, ...registerDto } = dto;

    const formattedRoles = roles.map((r) => ({
      name: r,
    }));

    // 👇 return user + tokens from transaction
    const { user, tokens } = await this.db.transaction(async (queryRunner) => {
      const user = await this.usersService.create(
        {
          ...registerDto,
          role: roles.includes('expert') ? 'expert' : 'client',
          signinBy: 'email&password',
          roles: formattedRoles,
          password: hashed,
          phone,
          ip_address: ip,
        },
        queryRunner,
      );

      const tokens = await this.tokenService.generateTokens(
        user,
        ip,
        userAgent,
        // transactionalRepo case handled here? 
        // TokenService needs to support queryRunner if we want full ACID.
        // For now, I'll pass it if I can, but Repository interfaces might need it.
        // I'll skip deep transactional integration for repo patterns for now to keep it simple as requested.
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
          user.name || 'User',
          verification_token,
          roles.includes('expert') ? 'expert' : 'client',
        ),
      );

      return { user, tokens };
    });

    // CHECK if user is EXPERT
    const isExpert = roles.includes('expert');

    if (isExpert) {
      // Return success message WITHOUT logging in
      return {
        message:
          'Registration successful. Please check your email to verify your account.',
      };
    }

    // 👇 set cookies (if Response passed) - CLIENT only
    if (res) {
      // Set refresh token in cookie
      this.setRefreshTokenCookie(res, tokens.refreshToken);
      // Set access token in cookie
      this.setAccessTokenCookie(res, tokens.accessToken);
    }

    // Return user AND access token
    return {
      ...instanceToPlain({ user }),
      accessToken: tokens.accessToken,
    };
  }

  // ---------------------------
  // CLIENT REGISTER with cookies service
  // ---------------------------
  async clientRegister(
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

    // Extract roles and phone from DTO, ensure 'client' role is assigned
    const { roles, phone, ...registerDto } = dto;

    // Ensure client role is assigned
    const clientRoles = roles && roles.length > 0 ? roles : ['client'];

    const formattedRoles = clientRoles.map((r) => ({
      name: r,
    }));

    // 👇 return user + tokens from transaction
    const { user, tokens } = await this.db.transaction(async (queryRunner) => {
      const user = await this.usersService.create(
        {
          ...registerDto,
          role: 'client',
          signinBy: 'email&password',
          roles: formattedRoles,
          password: hashed,
          phone,
          ip_address: ip,
        },
        queryRunner,
      );

      const tokens = await this.tokenService.generateTokens(
        user,
        ip,
        userAgent,
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
          user.name || 'User',
          verification_token,
          'client',
        ),
      );

      return { user, tokens };
    });

    // CLIENT now requires email verification - NO auto-login
    // Return success message WITHOUT logging in
    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

    // Check for email verification (required for all users now)
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Email not verified. Please verify your email before logging in.',
      );
    }

    // Check if user is blocked
    if (user.isBlocked) {
      throw new UnauthorizedException(
        'Your account has been blocked. Please contact support.',
      );
    }

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

    // If logging in from expert dashboard, verify they are an expert
    if (dto.expert) {
      const hasExpertRole = user.roles?.some((r: any) =>
        typeof r === 'string' ? r === 'expert' : r.name === 'expert',
      );
      if (!hasExpertRole) {
        throw new UnauthorizedException(
          'Access denied. You do not have an expert account with this email.',
        );
      }

      // 🔹 Fetch expert profile
      const userWithProfile = await this.usersService.findById(user.id);
      user.profile_expert = userWithProfile.profile_expert;

      // 🔹 IP Check for Experts
      if (user.ip_address && ip && user.ip_address !== ip) {
        const token = this.tokenService.generate5MinToken({
          sub: user.id,
          email: user.email,
          newIp: ip,
        });

        this.eventEmitter.emit(
          'user:verify-ip',
          new VerifyIpEvent(user.email, user.name || 'Expert', token, ip!),
        );

        throw new UnauthorizedException({
          message: 'IP_MISMATCH',
          error: 'Different IP address detected. Please verify via email.',
        });
      }
    }

    const tokens = await this.tokenService.generateTokens(user, ip, userAgent);

    if (res) {
      // Set refresh token in cookie
      this.setRefreshTokenCookie(res, tokens.refreshToken);
      // Set access token in cookie
      this.setAccessTokenCookie(res, tokens.accessToken);
    }

    // Return user AND access token
    return {
      ...instanceToPlain({ user }),
      accessToken: tokens.accessToken,
    };
  }

  // ---------------------------
  // CLIENT LOGIN with cookies
  // ---------------------------
  async clientLogin(
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
    res?: Response, // 👈 get Response from controller
  ) {
    const user = await this.validateUser(dto.email, dto.password);

    // Verify user has client role
    const hasClientRole = user.roles?.some((r: any) =>
      typeof r === 'string' ? r === 'client' : r.name === 'client',
    );

    if (!hasClientRole) {
      throw new UnauthorizedException(
        'Access denied. You do not have a client account with this email.',
      );
    }
    const tokens = await this.tokenService.generateTokens(user, ip, userAgent);

    if (res) {
      // Set refresh token in cookie
      this.setRefreshTokenCookie(res, tokens.refreshToken);
      // Set access token in cookie
      this.setAccessTokenCookie(res, tokens.accessToken);
    }

    // Return user AND access token
    return {
      ...instanceToPlain({ user }),
      accessToken: tokens.accessToken,
    };
  }

  async oauthLogin(dto: OAuthUserDto, ip?: string, userAgent?: string) {
    const user = await this.oauthService.findOrCreateUserFromOAuth(dto);
    const tokens = await this.tokenService.generateTokens(user, ip, userAgent);

    return { user, ...tokens }; // (you can also move this to cookies later)
  }

  async logout(id: number) {
    await this.tokenService.revoke(id);
  }

  async clientLogout(id: number) {
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

  async forgotPassword(email: string, origin?: string) {
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
      new ResetPasswordEvent(existingUser.email, reset_password_token, origin),
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

  async verifyIp(token: string, ip?: string, userAgent?: string, res?: Response) {
    try {
      const payload = await this.tokenService.verifyToken(token);

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      await this.checkTokenUsed(token, user.id);

      // Update Expert IP Address
      if (payload.newIp) {
        await this.usersService.update(user.id, { ip_address: payload.newIp });
      }

      const tokens = await this.tokenService.generateTokens(user, ip, userAgent);

      if (res) {
        this.setRefreshTokenCookie(res, tokens.refreshToken);
        this.setAccessTokenCookie(res, tokens.accessToken);
      }

      await this.usedTokenService.addUsedToken(token, user.id, 'ip verification');

      return {
        ...instanceToPlain({ user }),
        accessToken: tokens.accessToken,
      };
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
  public setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      refreshToken,
      getRefreshTokenCookieOptions(),
    );
  }

  public setAccessTokenCookie(res: Response, accessToken: string) {
    res.cookie(
      COOKIE_NAMES.ACCESS_TOKEN,
      accessToken,
      getAccessTokenCookieOptions(),
    );
  }
}

