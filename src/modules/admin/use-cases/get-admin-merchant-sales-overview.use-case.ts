import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { OrderFacade } from '@/modules/commerce/order/order.facade';

@Injectable()
export class GetAdminMerchantSalesOverviewUseCase {
  constructor(
    @Inject(forwardRef(() => OrderFacade))
    private readonly orderFacade: OrderFacade,
  ) {}

  async execute() {
    return this.orderFacade.getAdminMerchantSalesOverview();
  }
}
