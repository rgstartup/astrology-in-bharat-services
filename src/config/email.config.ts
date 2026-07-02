import { registerAs } from '@nestjs/config';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  frontendUrl: string;
  expertFrontendUrl: string;
}

export default registerAs<Partial<EmailConfig>>('email', () => ({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
  frontendUrl: process.env.FRONTEND_URL,
  expertFrontendUrl: process.env.ASTROLOGER_FRONTEND_URL,
}));
