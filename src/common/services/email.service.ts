// src/common/services/email.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const emailConfig = this.configService.get('email', { infer: true });

    // Configure the transporter
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
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
      const info = await this.transporter.sendMail({
        from: `"No Reply" <${process.env.SMTP_FROM}>`,
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
    const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;
    const html = `
      <p>Hello,</p>
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
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const html = `
      <p>Hello,</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, you can ignore this email.</p>
    `;
    return this.sendEmail(to, 'Reset your password', html);
  }
}
