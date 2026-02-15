import { EmailConfig } from '@/config/email.config';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const NODEMAILER_TRANSPORTER = Symbol('NODEMAILER_TRANSPORTER');

export const NodemailerProvider: Provider = {
  provide: NODEMAILER_TRANSPORTER,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const email = config.get<EmailConfig>('email', { infer: true });

    if (!email) {
      throw new Error('Email config not found');
    }

    return nodemailer.createTransport({
      host: email.host,
      port: email.port,
      secure: email.secure,
      auth: {
        user: email.user,
        pass: email.pass,
      },
    });
  },
};
