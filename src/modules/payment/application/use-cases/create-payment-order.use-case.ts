import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPaymentGateway, PAYMENT_GATEWAY } from '@/external/payment/payment-gateway.interface';
import {
  PaymentOrder,
  PaymentStatus,
} from '../../infrastructure/entities/payment-order.entity';
import { CreateOrderDto } from '../../api/dto/create-order.dto';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '@/common/types/domain.error';
import { PaymentOrderCreationFailedError } from '../../domain/errors/payment.errors';

@Injectable()
export class CreatePaymentOrderUseCase {
  private readonly logger = new Logger(CreatePaymentOrderUseCase.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private readonly paymentOrderRepo: Repository<PaymentOrder>,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly orderFacade: OrderFacade,
    private readonly configService: ConfigService,
  ) { }

  async execute(userId: string, dto: CreateOrderDto) {
    this.logger.log(
      `Creating order for user ${userId} with data:`,
      JSON.stringify(dto, null, 2),
    );

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

      const order = await this.paymentGateway.createOrder({
        amount: options.amount,
        currency: options.currency,
        receiptId: options.receipt,
        notes: options.notes,
      });

      const { ProfileClient } = await import('../../../client/profile/infrastructure/entities/profile-client.entity');
      const clientProfile = await this.paymentOrderRepo.manager.findOne(ProfileClient, { where: { user: { id: userId } } });

      const paymentOrder = this.paymentOrderRepo.create({
        client_id: clientProfile ? clientProfile.id : null,
        razorpay_order_id: order.providerOrderId,
        amount,
        notes: options.notes,
        status: PaymentStatus.PENDING,
      });

      await this.paymentOrderRepo.save(paymentOrder);

      // If it's a product order, link the Razorpay Order ID to the internal order
      const internalOrderId = notes?.orderId || notes?.order_id;
      if (type === 'product' && internalOrderId) {
        await this.orderFacade.setRazorpayOrderId(
          Number(internalOrderId),
          order.providerOrderId,
        );
      }

      return {
        id: order.providerOrderId,
        amount: order.amount,
        currency: order.currency,
        key_id: this.configService.get<string>('RAZORPAY_KEY_ID'),
      };
    } catch (error) {
      this.logger.error('Error creating payment order', error.stack);
      if (error instanceof DomainError) {
        throw error;
      }
      throw new PaymentOrderCreationFailedError();
    }
  }
}
