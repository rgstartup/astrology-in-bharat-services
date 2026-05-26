import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { NODEMAILER_TRANSPORTER } from './nodemailer.provider';

@Injectable()
export class NodeMailerService {
  constructor(
    @Inject(NODEMAILER_TRANSPORTER)
    private transporter: nodemailer.Transporter,
    private configService: ConfigService,
  ) { }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const fromEmail = this.configService.get('email.from');
      const authUser = this.configService.get('email.user');

      return await this.transporter.sendMail({
        from: fromEmail ? `"Astrology in Bharat" <${fromEmail}>` : authUser,
        to,
        subject,
        html,
      });
    } catch (error: any) {
      console.warn('⚠️ NodeMailer error (Email not sent):', error.message);
      // Return false instead of throwing so that auth flow doesn't crash in dev
      return false;
    }
  }
}
