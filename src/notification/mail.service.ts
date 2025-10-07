import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailConfig } from 'src/core/config/email.config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly mailConfig?: EmailConfig;

  constructor(private config: ConfigService) {
    this.mailConfig = this.config.get<EmailConfig>('email');

    if (!this.mailConfig) {
      throw new Error('Email config not found');
    }

    this.transporter = nodemailer.createTransport({
      host: this.mailConfig.host,
      port: this.mailConfig.port,
      secure: this.mailConfig.secure, // true for 465, false for 587
      auth: {
        user: this.mailConfig.user,
        pass: this.mailConfig.pass,
      },
    });
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: this.mailConfig?.from,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (err) {
      this.logger.error('Error sending mail', err);
      throw err;
    }
  }
}
