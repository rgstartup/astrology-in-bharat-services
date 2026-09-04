import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { EmailQueueService } from '@/core/queue/services/email-queue.service';

interface ExpertRegisteredEvent {
  email: string;
  name?: string;
  verification_token: string;
}

@Injectable()
export class ExpertRegisteredHandler {
  private readonly logger = new Logger(ExpertRegisteredHandler.name);

  constructor(
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent('auth.expert.registered', { async: true })
  handle(event: ExpertRegisteredEvent) {
    const frontendUrl =
      this.config.get<string>('email.expertFrontendUrl') ||
      process.env.ASTROLOGER_FRONTEND_URL ||
      this.config.get<string>('email.frontendUrl') ||
      process.env.FRONTEND_URL;

    if (!frontendUrl) {
      this.logger.warn(
        'ASTROLOGER_FRONTEND_URL is not configured; sending the verification token without a link',
      );
    }

    const link = frontendUrl
      ? `${frontendUrl.replace(/\/+$/, '')}/verify-email?verification_token=${encodeURIComponent(event.verification_token)}`
      : null;

    const verificationAction = link
      ? `
        <p>
          <a href="${link}" style="display:inline-block;padding:12px 20px;background:#673ab7;color:#fff;text-decoration:none;border-radius:6px;">
            Verify Email Address
          </a>
        </p>
        <p>If the button does not work, copy this URL:</p>
        <p style="word-break:break-all;"><a href="${link}">${link}</a></p>
      `
      : '<p>No expert frontend URL is configured. Use the token below to complete registration through the API.</p>';

    return this.emailQueue.queueEmail({
      to: event.email,
      subject: 'Verify your expert account',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
          <h2>Verify your expert account</h2>
          <p>Hi ${event.name ?? 'there'},</p>
          <p>Complete your Astrology in Bharat expert registration.</p>
          ${verificationAction}
          <p>Verification token:</p>
          <pre style="white-space:pre-wrap;word-break:break-all;background:#f5f5f5;padding:12px;border-radius:4px;">${event.verification_token}</pre>
          <p>If you did not request this account, you can ignore this email.</p>
        </div>
      `,
    });
  }
}
