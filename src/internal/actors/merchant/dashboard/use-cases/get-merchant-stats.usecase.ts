import { Injectable } from '@nestjs/common';
import { OrderService } from '../../../../commerce/order/order.service';
import { ProductService } from '../../../../commerce/product/product.service';
import { CalculateMerchantEarningsUseCase } from './calculate-merchant-earnings.usecase';

@Injectable()
export class GetMerchantStatsUseCase {
  constructor(
    private readonly orderService: OrderService,
    private readonly productService: ProductService,
    private readonly calculateEarnings: CalculateMerchantEarningsUseCase,
  ) {}

  async execute(userId: number) {
    console.log('[DASHBOARD_STATS] Request for userId:', userId);

    const [totalOrdersCount, total_products, earnings] = await Promise.all([
      this.orderService.getMerchantTotalOrders(userId),
      this.productService
        .findMerchantProducts(userId, {})
        .then((res) => res.total)
        .catch(() => 0),
      this.calculateEarnings.execute(userId),
    ]);

    const result = {
      totalOrders: { value: totalOrdersCount, trend: '+10%' },
      totalProducts: { value: total_products, trend: '+2 new' },
      totalEarnings: {
        value: earnings.netTotal,
        trend: '+15%',
      },
      monthlyEarnings: {
        value: earnings.netMonthly,
        trend: '+8%',
      },
    };
    console.log('[DASHBOARD_STATS] Result:', result);
    return result;
  }
}
