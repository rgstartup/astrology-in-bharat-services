import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { OrderService } from '@/internal/commerce/order/order.service';

@Injectable()
export class GetAdminMerchantSalesDetailsUseCase {
  constructor(
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {}

  async execute(merchantId: number) {
    return this.orderService.getAdminMerchantSalesDetails(merchantId);
  }
}
