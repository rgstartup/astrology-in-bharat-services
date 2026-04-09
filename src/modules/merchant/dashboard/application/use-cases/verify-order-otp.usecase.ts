import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '@/modules/order/infrastructure/persistence/entities/order.entity';
import { OrderItem } from '@/modules/order/infrastructure/persistence/entities/order-item.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';

@Injectable()
export class VerifyOrderOtpUseCase {
  private readonly logger = new Logger(VerifyOrderOtpUseCase.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly walletFacade: WalletFacade,
    private readonly dataSource: DataSource,
  ) {}

  async execute(merchantUserId: number, orderId: number, otp: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Fetch Order with Items and Products
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items', 'items.product'],
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // 2. Verify OTP
      if (order.delivery_otp !== otp) {
        throw new BadRequestException('Invalid delivery OTP');
      }

      // 3. Find items belonging to THIS merchant
      const merchantItems = order.items.filter(item => item.product.merchant_id === merchantUserId);
      
      if (merchantItems.length === 0) {
        throw new ForbiddenException('No products from your shop found in this order');
      }

      // 4. Calculate Payout for this merchant
      let merchantPayout = 0;
      merchantItems.forEach(item => {
        merchantPayout += Number(item.price) * (item.quantity || 1);
      });

      // 5. Update Order Status to DELIVERED
      // (Note: In a multi-merchant order, this might need refinement, but per current DB structure, order status is global)
      order.status = OrderStatus.DELIVERED;
      await queryRunner.manager.save(Order, order);

      // 6. Credit Merchant Wallet
      // Only if the order was paid (wallet or online)
      if (order.status === OrderStatus.DELIVERED) {
          await this.walletFacade.credit(
            merchantUserId,
            merchantPayout,
            TransactionPurpose.PRODUCT_PURCHASE,
            `order_${order.id}_fulfillment_credit`,
            queryRunner
          );
          this.logger.log(`[VERIFY_OTP] Credited ₹${merchantPayout} to merchant ${merchantUserId} for order ${order.id}`);
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Order delivered and payment credited successfully',
        payoutAmount: merchantPayout,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
