import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { ProductFacade } from '@/modules/commerce/product/application/product.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class GetMerchantStatsUseCase {
  constructor(
    private readonly orderFacade: OrderFacade,
    private readonly productFacade: ProductFacade,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
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

    // Estimate Net Earnings (subtracting platform fee and GST)
    const platformFeeRate =
      await this.walletFacade.getAdminCommissionFromSetting(
        'COMMISION_FROM_PUJA_SHOP',
      );
    const gstRate =
      await this.walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');

    const calculateNet = (gross: number) => {
      const fee = gross * (platformFeeRate / 100);
      const gstOnFee = fee * (gstRate / 100);
      return Number((gross - fee - gstOnFee).toFixed(2));
    };

    const result = {
      totalOrders: { value: totalOrdersCount, trend: '+10%' },
      totalProducts: { value: total_products, trend: '+2 new' },
      totalEarnings: {
        value: calculateNet(grossTotal),
        trend: '+15%',
      },
      monthlyEarnings: {
        value: calculateNet(grossMonthly),
        trend: '+8%',
      },
    };
    console.log('[DASHBOARD_STATS] Result:', result);
    return result;
  }
}
