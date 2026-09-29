import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentGateway,
  PaymentOrderOptions,
  PaymentOrderResult,
  StandardWebhookEvent,
  VerifySignatureOptions,
  WebhookValidationRequest,
} from '../../payment-gateway.interface';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { RazorpayConfig } from '../../../../config/razorpay.config';

@Injectable()
export class RazorpayProvider implements IPaymentGateway {
  readonly providerName = 'razorpay';
  private razorpay: Razorpay;
  private readonly logger = new Logger(RazorpayProvider.name);

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<RazorpayConfig>('razorpay');
    const keyId = config?.keyId;
    const keySecret = config?.keySecret;

    if (keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    } else {
      this.logger.warn(
        'Razorpay keys not found. Payment provider will not work.',
      );
    }
  }

  async createOrder(options: PaymentOrderOptions): Promise<PaymentOrderResult> {
    if (!this.razorpay) {
      throw new BadRequestException('Payment gateway not configured');
    }

    try {
      const order = await this.razorpay.orders.create({
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        notes: options?.notes,
      });

      return {
        providerOrderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        rawResponse: order,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        'Error creating Razorpay order',
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        `Payment order creation failed: ${errorMessage}`,
      );
    }
  }

  verifySignature(options: VerifySignatureOptions): boolean {
    const secret =
      this.configService.get<RazorpayConfig>('razorpay')?.keySecret || '';
    const body = options.providerOrderId + '|' + options.providerPaymentId;

    const expectedSignature = createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return expectedSignature === options.signature;
  }

  verifyWebhookSignature(request: WebhookValidationRequest): boolean {
    const signature = request.headers['x-razorpay-signature'] as
      | string
      | undefined;
    if (!signature) {
      return false;
    }

    const webhookSecret =
      this.configService.get<RazorpayConfig>('razorpay')?.webhookSecret || '';

    const dataToHash =
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(dataToHash)
      .digest('hex');

    return expectedSignature === signature;
  }

  parseWebhook(request: WebhookValidationRequest): StandardWebhookEvent {
    const payload = request.body;
    const event = payload?.event as string | undefined;

    const paymentEntity = (
      payload?.payload as Record<string, Record<string, any>>
    )?.payment?.entity;

    let eventType: StandardWebhookEvent['eventType'] = 'other';
    if (event === 'payment.captured' || event === 'order.paid') {
      eventType = 'payment.success';
    } else if (event === 'payment.failed') {
      eventType = 'payment.failed';
    }

    return {
      eventType,
      providerOrderId: paymentEntity?.order_id || '',
      providerPaymentId: paymentEntity?.id || '',
      amount: paymentEntity?.amount ? paymentEntity.amount / 100 : 0,
      metadata: paymentEntity?.notes || {},
      failureReason: paymentEntity?.error_description || undefined,
      rawEvent: payload,
    };
  }

  validateWebhookSignature(
    payload: string | Record<string, unknown>,
    signature: string,
  ): boolean {
    return this.verifyWebhookSignature({
      headers: { 'x-razorpay-signature': signature },
      body: payload,
    });
  }
}
