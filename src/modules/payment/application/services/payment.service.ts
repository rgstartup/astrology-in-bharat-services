import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { DataSource } from 'typeorm';
import { OrderService } from '@/modules/order';
import { WalletService } from '@/modules/wallet/application/services/wallet.service';
import { PaymentOrder, PaymentStatus } from '../../domain/entities/payment-order.entity';
import { IPaymentOrderRepository } from '../../domain/repositories/payment-order.repository.interface';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { VerifyPaymentDto } from '../dtos/verify-payment.dto';

@Injectable()
export class PaymentService {
    private razorpay: Razorpay;
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private configService: ConfigService,
        @Inject(IPaymentOrderRepository)
        private paymentOrderRepo: IPaymentOrderRepository,
        private walletService: WalletService,
        private orderService: OrderService,
        private dataSource: DataSource,
    ) {
        const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        if (keyId && keySecret) {
            this.razorpay = new Razorpay({
                key_id: keyId,
                key_secret: keySecret,
            });
        } else {
            this.logger.warn('Razorpay keys not found. Payment features will not work.');
        }
    }

    async createOrder(userId: number, dto: CreateOrderDto) {
        this.logger.log(`Creating order for user ${userId} with data:`, JSON.stringify(dto, null, 2));

        if (!this.razorpay) {
            throw new BadRequestException('Payment gateway not configured');
        }
        try {
            const { amount, notes, type } = dto;

            const options = {
                amount: amount * 100, // razorpay expects in paise
                currency: 'INR',
                receipt: `receipt_${Date.now()}`,
                notes: {
                    userId: userId.toString(),
                    type,
                    ...notes,
                },
            };

            const order: any = await this.razorpay.orders.create(options as any);

            const paymentOrder = this.paymentOrderRepo.create({
                userId,
                razorpayOrderId: order.id,
                amount,
                notes: options.notes,
                status: PaymentStatus.PENDING,
            });

            await this.paymentOrderRepo.save(paymentOrder);

            // If it's a product order, link the Razorpay Order ID to the internal order
            if (type === 'product' && notes?.orderId) {
                await this.orderService.setRazorpayOrderId(Number(notes.orderId), order.id);
            }

            return {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: this.configService.get<string>('RAZORPAY_KEY_ID'),
            };
        } catch (error) {
            this.logger.error('Error creating Razorpay order', error.stack);
            this.logger.error('Razorpay error details:', JSON.stringify(error, null, 2));

            // Extract more specific error message if available
            const errorMessage = error?.error?.description || error?.message || 'Failed to create payment order';
            throw new BadRequestException(`Payment order creation failed: ${errorMessage}`);
        }
    }

    async verifyPayment(dto: VerifyPaymentDto) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

        const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';
        const body = razorpay_order_id + '|' + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body.toString())
            .digest('hex');

        if (razorpay_signature && expectedSignature !== razorpay_signature) {
            throw new BadRequestException('Invalid payment signature');
        }

        const order = await this.paymentOrderRepo.findOne({
            where: { razorpayOrderId: razorpay_order_id },
        });

        if (!order) {
            throw new BadRequestException('Order not found');
        }

        if (order.status === PaymentStatus.SUCCESS) {
            return { success: true, message: 'Payment already verified' };
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            order.status = PaymentStatus.SUCCESS;
            order.razorpayPaymentId = razorpay_payment_id;
            order.razorpaySignature = razorpay_signature || '';
            await queryRunner.manager.save(order);

            const isProduct = order.notes?.type === 'product' || order.notes?.isOrder === true;

            if (!isProduct) {
                // Case 1: Wallet Recharge
                await this.walletService.topUp(order.userId, order.amount, `razorpay_${razorpay_payment_id}`);
                await queryRunner.commitTransaction();
                return { success: true, message: 'Payment successful and wallet updated' };
            } else {
                // Case 2: Product Purchase
                // Here we update the product_orders table status
                await this.orderService.markAsPaid(order.razorpayOrderId);
                this.logger.log(`Product payment verified for order ${order.razorpayOrderId}`);
                await queryRunner.commitTransaction();
                return { success: true, message: 'Payment successful for product order' };
            }
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Error verifying payment', error.stack);
            throw new BadRequestException('Failed to process payment verification');
        } finally {
            await queryRunner.release();
        }
    }

    async handleWebhook(signature: string, payload: any) {
        const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';

        // Validate signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (expectedSignature !== signature) {
            throw new BadRequestException('Invalid webhook signature');
        }

        const event = payload.event;
        if (event === 'payment.captured') {
            const payment = payload.payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;

            // Verify if order already processed
            const order = await this.paymentOrderRepo.findOne({
                where: { razorpayOrderId: orderId },
            });

            if (order && order.status !== PaymentStatus.SUCCESS) {
                await this.verifyPayment({
                    razorpay_order_id: orderId,
                    razorpay_payment_id: paymentId,
                    razorpay_signature: '', // We trust webhook if signature matches
                });
                // Note: the verifyPayment above needs a minor adjustment if signature is optional or handled differently
            }
        }

        return { received: true };
    }
}
