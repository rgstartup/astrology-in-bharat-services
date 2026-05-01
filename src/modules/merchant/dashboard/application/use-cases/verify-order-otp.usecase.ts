import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '@/modules/order/infrastructure/persistence/entities/order.entity';
import { OrderItem } from '@/modules/order/infrastructure/persistence/entities/order-item.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';

import { OrderFacade } from '@/modules/order/application/order.facade';

@Injectable()
export class VerifyOrderOtpUseCase {
  private readonly logger = new Logger(VerifyOrderOtpUseCase.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly orderFacade: OrderFacade,
    private readonly walletFacade: WalletFacade,
    private readonly dataSource: DataSource,
  ) {}

  async execute(merchantUserId: number, orderId: number, otp: string) {
    const order = await this.orderRepo.findOne({
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

    // 4. Calculate Payout for this merchant (for response only - Estimate Net)
    let grossTotal = 0;
    merchantItems.forEach(item => {
      grossTotal += Number(item.price) * (item.quantity || 1);
    });

    // Fetch settings for accurate estimation in the response
    const platformFeeRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_PUJA_SHOP');
    const gstRate = await this.walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');

    const estimatedFee = grossTotal * (platformFeeRate / 100);
    const estimatedGst = estimatedFee * (gstRate / 100);
    const netPayout = Number((grossTotal - estimatedFee - estimatedGst).toFixed(2));

    // 5. Update Status via Central Facade (Handles all commissions and settlements)
    await this.orderFacade.updateOrderStatus(orderId, OrderStatus.DELIVERED, undefined, merchantUserId);

    return {
      success: true,
      message: 'Order delivered and payment settled successfully',
      payoutAmount: netPayout,
    };
  }
}
