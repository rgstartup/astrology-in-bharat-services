import { Inject, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { NODEMAILER_TRANSPORTER } from './nodemailer.provider';

@Injectable()
export class NodeMailerService {
  constructor(
    @Inject(NODEMAILER_TRANSPORTER)
    private transporter: nodemailer.Transporter,
    private configService: ConfigService,
  ) {}

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const fromEmail = this.configService.get<string>('email.from');
      const authUser = this.configService.get<string>('email.user');

      console.log(`[NodeMailer] Attempting to send email to ${to} (Subject: ${subject})`);
      const info = await this.transporter.sendMail({
        from: fromEmail ? `"Astrology in Bharat" <${fromEmail}>` : authUser,
        to,
        subject,
        html,
      });
      console.log(`[NodeMailer] Successfully sent email to ${to}. MessageId: ${info.messageId}`);
      return info as Record<string, unknown>;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ [NodeMailer] Error (Email not sent):', errorMessage);
      // Return false instead of throwing so that auth flow doesn't crash in dev
      return false;
    }
  }
}
