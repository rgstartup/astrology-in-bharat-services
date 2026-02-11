import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const emailHost = this.configService.get<string>('SMTP_HOST');
    const emailPort = this.configService.get<number>('SMTP_PORT');
    const emailUser = this.configService.get<string>('SMTP_USER');
    const emailPass = this.configService.get<string>('SMTP_PASS');
    const emailSecure = this.configService.get<boolean>('SMTP_SECURE') ?? false;

    // Configure the transporter
    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailSecure,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  /**
   * Send an email
   * @param to Recipient email address
   * @param subject Email subject
   * @param html HTML content
   */
  async sendEmail(to: string, subject: string, html: string) {
    try {
      const from = this.configService.get<string>('SMTP_FROM') || '"No Reply" <noreply@example.com>';
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      console.log('Email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email', error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  /**
   * Send email confirmation
   */
  async sendConfirmationEmail(to: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const confirmUrl = `${frontendUrl}/confirm-email?token=${token}`;
    const html = `
      <p>Hello</p>
      <p>Please confirm your email by clicking the link below:</p>
      <a href="${confirmUrl}">Confirm Email</a>
      <p>If you did not request this, you can ignore this email.</p>
    `;
    return this.sendEmail(to, 'Confirm your email', html);
  }

  /**
   * Send password reset email
   */
  async sendResetPasswordEmail(to: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const html = `
      <p>Hello,</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, you can ignore this email.</p>
    `;
    return this.sendEmail(to, 'Reset your password', html);
  }
}
