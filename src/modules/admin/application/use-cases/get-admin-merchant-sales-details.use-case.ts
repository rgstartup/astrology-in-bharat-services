import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';

@Injectable()
export class GetAdminMerchantSalesDetailsUseCase {
  constructor(
    @Inject(forwardRef(() => OrderFacade))
    private readonly orderFacade: OrderFacade,
  ) {}

  async execute(merchantId: string) {
    return this.orderFacade.getAdminMerchantSalesDetails(merchantId);
  }
}
