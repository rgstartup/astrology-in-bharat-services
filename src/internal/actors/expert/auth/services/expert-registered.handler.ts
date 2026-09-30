import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailQueueService } from '@/core/queue/services/email-queue.service';

export interface ExpertRegisteredEventPayload {
  userId: number;
  email: string;
  name?: string;
  role: string;
  otp: string;
}

@Injectable()
export class ExpertRegisteredHandler {
  private readonly logger = new Logger(ExpertRegisteredHandler.name);

  constructor(private readonly emailQueue: EmailQueueService) {}

  @OnEvent('auth.expert.registered', { async: true })
  async handle(event: ExpertRegisteredEventPayload) {
    this.logger.debug('Email sending OTP to the expert');
    await this.emailQueue.queueEmail({
      to: event.email,
      subject: 'Verify your expert account - Astrology in Bharat',
      html: this.buildTemplate(event),
    });
  }

  private buildTemplate(event: ExpertRegisteredEventPayload) {
    console.log('\n======================================================');
    console.log('✅ NEW EXPERT REGISTRATION OTP GENERATED:');
    console.log(`Email: ${event.email} | OTP: ${event.otp}`);
    console.log('======================================================\n');

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Welcome to Astrology in Bharat!</h2>
        <p>Hi ${event.name ?? 'there'},</p>
        <p>Thank you for registering as an expert. Please use the following 6-digit OTP to complete your registration:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #673ab7; background-color: #ede7f6; padding: 12px 24px; border-radius: 8px; border: 1px dashed #673ab7; display: inline-block;">
            ${event.otp}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `;
  }
}
