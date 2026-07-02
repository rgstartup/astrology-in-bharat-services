import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
  private razorpay: Razorpay;
  private readonly logger = new Logger(RazorpayService.name);

  constructor(private configService: ConfigService) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    } else {
      this.logger.warn(
        'Razorpay keys not found. Payment features will not work.',
      );
    }
  }

  async createOrder(options: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }) {
    if (!this.razorpay) {
      throw new BadRequestException('Payment gateway not configured');
    }
    try {
      return await this.razorpay.orders.create(
        options as Parameters<typeof this.razorpay.orders.create>[0],
      );
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error('Error creating Razorpay order', error.stack);
      throw new BadRequestException(
        `Payment order creation failed: ${error.message}`,
      );
    }
  }

  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';
    const body = orderId + '|' + paymentId;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }

  validateWebhookSignature(
    payload: string | Record<string, unknown>,
    signature: string,
  ): boolean {
    const webhookSecret =
      this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return expectedSignature === signature;
  }
}
