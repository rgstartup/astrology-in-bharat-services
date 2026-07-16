import { Injectable } from '@nestjs/common';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { ProductFacade } from '@/modules/commerce/product/application/product.facade';
import { CalculateMerchantEarningsUseCase } from './calculate-merchant-earnings.usecase';

@Injectable()
export class GetMerchantStatsUseCase {
  constructor(
    private readonly orderFacade: OrderFacade,
    private readonly productFacade: ProductFacade,
    private readonly calculateEarnings: CalculateMerchantEarningsUseCase,
  ) {}

  async execute(userId: string) {
    console.log('[DASHBOARD_STATS] Request for userId:', userId);

    const [totalOrdersCount, total_products, earnings] = await Promise.all([
      this.orderFacade.getMerchantTotalOrders(userId),
      this.productFacade
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
