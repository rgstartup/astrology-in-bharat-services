import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';

@Injectable()
export class VerifyOrderOtpUseCase {
  private readonly logger = new Logger(VerifyOrderOtpUseCase.name);

  constructor(
    private readonly orderFacade: OrderFacade,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
  ) {}

  async execute(merchantUserId: string, orderId: string, otp: string) {
    const { netPayout } = await this.orderFacade.verifyOrderOtp(
      orderId,
      otp,
      merchantUserId,
      this.walletFacade,
    );

    // 5. Update Status via Central Facade (Handles all commissions and settlements)
    await this.orderFacade.updateOrderStatus(
      orderId,
      OrderStatus.DELIVERED,
      undefined,
      merchantUserId,
    );

    return {
      success: true,
      message: 'Order delivered and payment settled successfully',
      payoutAmount: netPayout,
    };
  }
}
