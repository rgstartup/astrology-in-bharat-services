import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';
import {
  ConfirmEmailEvent,
  ResetPasswordEvent,
  SendMagicLinkEvent,
  UserRegisteredEvent,
  VerifyIpEvent,
} from '../events/user.event';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailNotificationService {
  constructor(
    private mailService: MailService,
    private configService: ConfigService,
  ) { }

  @OnEvent('user:register')
  async handleUserRegistered(event: UserRegisteredEvent) {
    const clientUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const expertUrl =
      this.configService.get<string>('ASTROLOGER_FRONTEND_URL') ||
      'http://localhost:3003';

    const baseUrl = event.role === 'expert' ? expertUrl : clientUrl;
    const verificationLink = `${baseUrl}/verify-email?token=${event.verification_token}`;

    await this.mailService.sendMail(
      event.email,
      'Welcome to Astrology in Bharat!',
      `Hi ${event.name}, thanks for signing up!`,
      `<h1>Welcome, ${event.name}</h1>
      <p>Thanks for signing up!</p>
      <hr/>
      <p>Please click the link below to verify your email:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>Or use this token: ${event.verification_token}</p>
      `,
    );
  }

  @OnEvent('user:confirm')
  async handleUserConfirmation(event: ConfirmEmailEvent) {
    await this.mailService.sendMail(
      event.email,
      `Confirm your email`,
      ` <p><strong>Your token</strong>: ${event.verification_token}</p>`,
    );
  }

  @OnEvent('user:reset-password')
  async handleResetPasswordEvent(event: ResetPasswordEvent) {
    const origin = event.origin || 'http://localhost:3000';
    const link = `${origin}/reset-password?token=${event.password_reset_token}`;

    await this.mailService.sendMail(
      event.email,
      `Reset your password`,
      `Click here to reset password: ${link}`,
      `<h1>Reset Your Password</h1>
       <p>You requested a password reset. Please click the link below to set a new password:</p>
       <a href="${link}" style="padding: 10px 20px; background-color: #fd6410; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
       <p>This link will expire in 5 minutes.</p>
       <p>If you did not request this, please ignore this email.</p>`
    );
  }

  @OnEvent('user:magic-link')
  async handleSendMagicLink(event: SendMagicLinkEvent) {
    const link = `http://localhost:3000/login/magic?token=${event.token}`;

    await this.mailService.sendMail(
      event.email,
      `Magic link`,
      `Click here to login`,
      `<button>
      <a href=${link}>Click here to login</a>
      </button>
      `,
    );
  }

  @OnEvent('user:verify-ip')
  async handleVerifyIp(event: VerifyIpEvent) {
    const expertUrl =
      this.configService.get<string>('ASTROLOGER_FRONTEND_URL') ||
      'http://localhost:3003';

    const verifyLink = `${expertUrl}/verify-ip?token=${event.token}`;

    await this.mailService.sendMail(
      event.email,
      'Verify Your Login - Astrology in Bharat',
      `Login attempt from a different IP address: ${event.ip}`,
      `<h1>Verify Your Login</h1>
       <p>Hi ${event.name},</p>
       <p>Your Astrology in Bharat astrologer profile got sign-in by a different IP address: <strong>${event.ip}</strong>.</p>
       <p>Please verify it's you by clicking the button below:</p>
       <a href="${verifyLink}" style="padding: 10px 20px; background-color: #fd6410; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Yes, it's me</a>
       <p>If this wasn't you, please secure your account immediately.</p>`
    );
  }
}
