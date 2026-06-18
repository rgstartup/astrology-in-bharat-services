import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const NODEMAILER_TRANSPORTER = Symbol('NODEMAILER_TRANSPORTER');

export const NodemailerProvider: Provider = {
  provide: NODEMAILER_TRANSPORTER,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const email = config.get('email') as Record<string, unknown>;

    if (!email) {
      throw new Error('Email config not found');
    }

    return nodemailer.createTransport({
      ...((email.host as string)?.includes('gmail')
        ? { service: 'gmail' }
        : {
            host: email.host as string,
            port: email.port as number,
            secure:
              (email.port as number) === 465 ? true : (email.secure as boolean),
          }),
      auth: {
        user: email.user as string,
        pass: ((email.pass as string) || '').replace(/\s+/g, ''),
      },
      logger: true,
      debug: true,
      connectionTimeout: 10000, // 10 seconds timeout
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  },
};
