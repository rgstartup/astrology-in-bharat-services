import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { ClientRegisteredEvent } from '../../domain/events/user-registered.event';
import { EmailQueueService } from '@/core/queue/services/email-queue.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClientRegisteredHandler {
  private readonly logger = new Logger(ClientRegisteredHandler.name);
  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly configService: ConfigService,
  ) { }

  @OnEvent('auth.client.registered', { async: true })
  async handle(event: ClientRegisteredEvent) {
    this.logger.debug('Email sending to the client');
    await this.emailQueueService.queueEmail({
      to: event.email,
      subject: 'Verify your email',
      html: this.buildTemplate(event),
    });
  }

  private buildTemplate(event: ClientRegisteredEvent) {
    let frontendUrl = this.configService.get<string>('email.frontendUrl');

    this.logger.debug(`Using frontendUrl: ${frontendUrl}`);

    const verifyLink = `${frontendUrl}/verify-email?verification_token=${event.verification_token}`;

    console.log('\n======================================================');
    console.log('✅ NEW USER REGISTERED! VERIFICATION LINK FOR TESTING:');
    console.log(verifyLink);
    console.log('======================================================\n');

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Welcome to Astrology in Bharat!</h2>
        <p>Hi ${event.name ?? 'there'},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #ff9800; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 13px;">${verifyLink}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `;
  }
}
