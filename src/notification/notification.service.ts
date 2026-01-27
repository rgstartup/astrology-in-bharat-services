import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';
import {
  ConfirmEmailEvent,
  ResetPasswordEvent,
  SendMagicLinkEvent,
  UserRegisteredEvent,
} from './events/user.event';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
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
    const link = `http://localhost:3000/reset-password?token=${event.password_reset_token}`;

    await this.mailService.sendMail(
      event.email,
      `Reset your password`,
      `Click here to reset password: ${link}`,
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
}
