import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { ProductFacade } from '@/modules/commerce/product/application/product.facade';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Injectable()
export class GetMerchantAnalyticsUseCase {
  constructor(
    private readonly orderFacade: OrderFacade,
    private readonly productFacade: ProductFacade,
    @InjectRepository(ProfileMerchant)
    private readonly profileRepo: Repository<ProfileMerchant>,
  ) {}

  async execute(userId: string) {
    const merchantId = userId;

    if (!merchantId) {
      return { revenueTimeline: [], topProducts: [], stockLevels: [] };
    }

    const revenueResult = (await this.orderFacade.getMerchantRevenueTimeline(
      merchantId,
    )) as Array<{ date: string; revenue: string | number }>;

    // 2. Top Selling Products
    const topProductsResult = (await this.orderFacade.getMerchantTopProducts(
      merchantId,
    )) as Array<{
      name: string;
      sales_count: string | number;
      total_revenue: string | number;
    }>;

    const totalSales = topProductsResult.reduce(
      (acc, curr) => acc + Number(curr.sales_count),
      0,
    );
    const topProducts = topProductsResult.map((p) => ({
      name: p.name,
      sales: Number(p.sales_count),
      revenue: Number(p.total_revenue),
      percentage:
        totalSales > 0
          ? Math.round((Number(p.sales_count) / totalSales) * 100)
          : 0,
    }));

    // 3. Stock Levels
    const stockResult = (await this.productFacade.getMerchantStockLevels(
      merchantId,
    )) as Array<Record<string, unknown>>;

    console.log(
      `[ANALYTICS_DEBUG] merchantId: ${merchantId}, pItems: ${topProducts.length}, stockItems: ${stockResult.length}`,
    );
    console.log(
      `[ANALYTICS_DEBUG] Stock Result Sample:`,
      JSON.stringify(stockResult.slice(0, 2)),
    );

    return {
      revenueTimeline: revenueResult.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue),
      })),
      topProducts,
      stockLevels: stockResult,
    };
  }
}
