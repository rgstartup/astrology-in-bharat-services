import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';
import { VerifyEmailEvent } from '../../domain/events/verify-email.event';

@Injectable()
export class VerifyEmailHandler {
  private readonly logger = new Logger(VerifyEmailHandler.name);
  constructor(private readonly nodeMailerService: NodeMailerService) {}

  @OnEvent('auth.email.verify', { async: true })
  async handle(event: VerifyEmailEvent) {
    this.logger.debug('Email sending to the user');
    await this.nodeMailerService.sendEmail(
      event.email,
      'Verify your email',
      this.buildTemplate(event),
    );
  }

  private buildTemplate(event: VerifyEmailEvent) {
    const confirmUrl = `${process.env.FRONTEND_URL}/verify-email?token=${event.verification_token}`;
    return `
      <p>Hello,</p>
      <p>Please confirm your email by clicking the link below:</p>
      <a href="${confirmUrl}">Confirm Email</a>
      <p>If you did not request this, you can ignore this email.</p>
    `;
  }
}
