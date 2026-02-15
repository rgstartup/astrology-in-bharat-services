import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';
import { ResetPasswordEvent } from '../../domain/events/reset-password.event';

@Injectable()
export class ResetPasswordEventHandler {
  private readonly logger = new Logger(ResetPasswordEventHandler.name);
  constructor(private readonly nodeMailerService: NodeMailerService) {}

  @OnEvent('auth.reset.password', { async: true })
  async handle(event: ResetPasswordEvent) {
    this.logger.debug('Password reset email sending to the user');
    await this.nodeMailerService.sendEmail(
      event.email,
      'Reset your password',
      this.buildTemplate(event),
    );
  }

  private buildTemplate(event: ResetPasswordEvent) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${event.password_reset_token}`;
    return `
      <p>Hello,</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, you can ignore this email.</p>
    `;
  }
}
