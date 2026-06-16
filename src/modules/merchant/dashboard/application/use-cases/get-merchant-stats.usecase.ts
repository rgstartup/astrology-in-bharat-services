import { Injectable } from '@nestjs/common';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { ProductFacade } from '@/modules/commerce/product/application/product.facade';
import {
  CommissionsFacade,
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
} from '@/modules/finance/commissions/application/commissions.facade';

@Injectable()
export class GetMerchantStatsUseCase {
  constructor(
    private readonly orderFacade: OrderFacade,
    private readonly productFacade: ProductFacade,
    private readonly commissionsFacade: CommissionsFacade,
  ) {}

  async execute(userId: string) {
    console.log('[DASHBOARD_STATS] Request for userId:', userId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalOrdersCount, total_products, grossMonthly, grossTotal] =
      await Promise.all([
        this.orderFacade.getMerchantTotalOrders(userId),
        this.productFacade
          .findMerchantProducts(userId, {})
          .then((res) => res.total)
          .catch(() => 0),
        this.orderFacade.getMerchantGrossMonthlyEarnings(userId, startOfMonth),
        this.orderFacade.getMerchantGrossTotalEarnings(userId),
      ]);

    const calculateNet = async (gross: number) => {
      if (gross <= 0) return 0;
      const [feeResult, gstResult] = await Promise.all([
        this.commissionsFacade.resolveCommission(
          CommissionEventType.PRODUCT_ORDER,
          CommissionType.PLATFORM_FEE,
          null,
          CommissionAppliesRole.MERCHANT,
          gross,
        ),
        this.commissionsFacade.resolveCommission(
          CommissionEventType.PRODUCT_ORDER,
          CommissionType.GST,
          null,
          CommissionAppliesRole.MERCHANT,
          gross,
        ),
      ]);
      return Number((gross - feeResult.amount - gstResult.amount).toFixed(2));
    };

    const result = {
      totalOrders: { value: totalOrdersCount, trend: '+10%' },
      totalProducts: { value: total_products, trend: '+2 new' },
      totalEarnings: {
        value: await calculateNet(grossTotal),
        trend: '+15%',
      },
      monthlyEarnings: {
        value: await calculateNet(grossMonthly),
        trend: '+8%',
      },
    };
    console.log('[DASHBOARD_STATS] Result:', result);
    return result;
  }
}
