import { registerAs } from '@nestjs/config';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  accountNumber?: string;
}

export default registerAs<Partial<RazorpayConfig>>('razorpay', () => ({
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  accountNumber: process.env.RAZORPAY_X_ACCOUNT_NUMBER,
}));
