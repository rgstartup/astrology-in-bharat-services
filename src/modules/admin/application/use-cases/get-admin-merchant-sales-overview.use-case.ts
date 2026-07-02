import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';

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
