import { Injectable, Logger } from '@nestjs/common';
import { OrderService } from '../../../../commerce/order/order.service';
import { OrderStatus } from '../../../../commerce/order/enum';

@Injectable()
export class VerifyOrderOtpUseCase {
  private readonly logger = new Logger(VerifyOrderOtpUseCase.name);

  constructor(private readonly orderService: OrderService) {}

  async execute(merchantUserId: number, orderId: number, otp: string) {
    const { netPayout } = await this.orderService.verifyOrderOtp(
      orderId,
      otp,
      merchantUserId,
    );

    // 5. Update Status via Central Service (Handles all commissions and settlements)
    await this.orderService.updateOrderStatus(
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
