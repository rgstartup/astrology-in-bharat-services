import { EmailConfig } from '@/config/email.config';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

export const NODEMAILER_TRANSPORTER = Symbol('NODEMAILER_TRANSPORTER');

export const NodemailerProvider: Provider = {
  provide: NODEMAILER_TRANSPORTER,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const email = config.get<EmailConfig>('email');

    if (!email) {
      throw new Error('Email config not found');
    }

    return createTransport({
      ...(email.host?.includes('gmail')
        ? { service: 'gmail' }
        : {
            host: email.host,
            port: email.port,
            secure: email.port === 465 ? true : email.secure,
          }),
      auth: {
        user: email.user,
        pass: email.pass.replace(/\s+/g, ''),
      },
      logger: true,
      debug: true,
      connectionTimeout: 10000, // 10 seconds timeout
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  },
};
