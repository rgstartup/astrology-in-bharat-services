import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { OrderService } from '@/internal/commerce/order/order.service';

@Injectable()
export class GetAdminMerchantSalesOverviewUseCase {
  constructor(
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: DeferredDependency<OrderService>,
  ) {}

  async execute() {
    return this.orderService.getAdminMerchantSalesOverview();
  }
}
