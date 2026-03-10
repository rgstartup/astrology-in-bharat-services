import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentGateway, PaymentOrderOptions, PaymentOrderResult, VerifySignatureOptions } from './payment-gateway.interface';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';

@Injectable()
export class RazorpayProvider implements IPaymentGateway {
    private razorpay: Razorpay;
    private readonly logger = new Logger(RazorpayProvider.name);

    constructor(private readonly configService: ConfigService) {
        const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        if (keyId && keySecret) {
            this.razorpay = new Razorpay({
                key_id: keyId,
                key_secret: keySecret,
            });
        } else {
            this.logger.warn('Razorpay keys not found. Payment provider will not work.');
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
                receipt: options.receiptId,
                notes: options.notes,
            });

            return {
                providerOrderId: order.id,
                amount: Number(order.amount),
                currency: order.currency,
                status: order.status,
                rawResponse: order,
            };
        } catch (error: any) {
            this.logger.error('Error creating Razorpay order', error.stack);
            throw new BadRequestException(`Payment order creation failed: ${error.message}`);
        }
    }

    verifySignature(options: VerifySignatureOptions): boolean {
        const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';
        const body = options.providerOrderId + '|' + options.providerPaymentId;

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        return expectedSignature === options.signature;
    }

    validateWebhookSignature(payload: string | Record<string, any>, signature: string): boolean {
        const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';

        // Webhooks usually require the raw string payload for signature verification
        const dataToHash = typeof payload === 'string' ? payload : JSON.stringify(payload);

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(dataToHash)
            .digest('hex');

        return expectedSignature === signature;
    }
}
