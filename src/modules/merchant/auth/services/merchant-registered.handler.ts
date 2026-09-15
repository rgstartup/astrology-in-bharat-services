import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { EmailQueueService } from '@/core/queue/services/email-queue.service';

interface MerchantRegisteredEvent {
  email: string;
  name?: string;
  verification_token: string;
}

@Injectable()
export class MerchantRegisteredHandler {
  private readonly logger = new Logger(MerchantRegisteredHandler.name);

  constructor(
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent('auth.merchant.registered', { async: true })
  handle(event: MerchantRegisteredEvent) {
    const frontendUrl =
      this.config.get<string>('email.merchantFrontendUrl') ||
      process.env.MERCHANT_FRONTEND_URL ||
      this.config.get<string>('email.frontendUrl') ||
      process.env.FRONTEND_URL;

    if (!frontendUrl) {
      this.logger.warn(
        'MERCHANT_FRONTEND_URL is not configured; sending the verification token without a link',
      );
    }

    const link = frontendUrl
      ? `${frontendUrl.replace(/\/+$/, '')}/verify-email?verification_token=${encodeURIComponent(event.verification_token)}`
      : null;

    const verificationAction = link
      ? `
        <p>
          <a href="${link}" style="display:inline-block;padding:12px 20px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:6px;">
            Verify Email Address
          </a>
        </p>
        <p>If the button does not work, copy this URL:</p>
        <p style="word-break:break-all;"><a href="${link}">${link}</a></p>
      `
      : '<p>No merchant frontend URL is configured. Use the token below to complete registration through the API.</p>';

    return this.emailQueue.queueEmail({
      to: event.email,
      subject: 'Verify your merchant account',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
          <h2>Verify your merchant account</h2>
          <p>Hi ${event.name ?? 'there'},</p>
          <p>Complete your Astrology in Bharat merchant registration.</p>
          ${verificationAction}
          <p>Verification token:</p>
          <pre style="white-space:pre-wrap;word-break:break-all;background:#f5f5f5;padding:12px;border-radius:4px;">${event.verification_token}</pre>
          <p>If you did not request this account, you can ignore this email.</p>
        </div>
      `,
    });
  }
}
