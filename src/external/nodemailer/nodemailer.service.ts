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
  ) {}

  async sendEmail(to: string, subject: string, html: string) {
    try {
      return await this.transporter.sendMail({
        from: `"No Reply" <${this.configService.get('email.from')}>`,
        to,
        subject,
        html,
      });
    } catch {
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
