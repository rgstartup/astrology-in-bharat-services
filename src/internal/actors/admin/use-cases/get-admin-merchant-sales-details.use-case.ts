import type { DeferredDependency } from '../../../shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { OrderService } from '../../commerce/order/order.service';

@Injectable()
export class GetAdminMerchantSalesDetailsUseCase {
  constructor(
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: DeferredDependency<OrderService>,
  ) {}

  async execute(merchantId: number) {
    return this.orderService.getAdminMerchantSalesDetails(merchantId);
  }
}
