import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RazorpayService } from '@/external/razorpay/razorpay.service';
import { PaymentOrder, PaymentStatus } from '../../infrastructure/persistence/entities/payment-order.entity';
import { CreateOrderDto } from '../../api/dto/create-order.dto';
import { OrderFacade } from '@/modules/order/application/order.facade';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CreatePaymentOrderUseCase {
    private readonly logger = new Logger(CreatePaymentOrderUseCase.name);

    constructor(
        @InjectRepository(PaymentOrder)
        private paymentOrderRepo: Repository<PaymentOrder>,
        private razorpayService: RazorpayService,
        private orderFacade: OrderFacade,
        private configService: ConfigService,
    ) {}

    async execute(userId: number, dto: CreateOrderDto) {
        this.logger.log(`Creating order for user ${userId} with data:`, JSON.stringify(dto, null, 2));

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

            const order = await this.razorpayService.createOrder(options);

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
                await this.orderFacade.setRazorpayOrderId(Number(notes.orderId), order.id);
            }

            return {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: this.configService.get<string>('RAZORPAY_KEY_ID'),
            };
        } catch (error) {
            this.logger.error('Error creating payment order', error.stack);
            throw new BadRequestException(`Payment order creation failed: ${error.message}`);
        }
    }
}
