import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { eq, notInArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { orderItems, orders, products } from '@/core/drizzledb/schema';
import { OrderStatus } from '@/internal/commerce/order/enum';
import { MerchantAccountService } from '@/internal/actors/merchant/account/account.service';

@Injectable()
export class GetAdminMerchantSalesOverviewUseCase {
  constructor(
    @Inject(forwardRef(() => MerchantAccountService))
    private readonly merchantService: DeferredDependency<MerchantAccountService>,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async execute() {
    try {
      // 1. Fetch all merchants
      const merchants = await this.merchantService.getRawAccounts();

      // 2. Aggregate sales data per merchant (grouped by user_id)
      const sales_data = await this.db
        .select({
          userId: products.merchant_id,
          totalRevenue: sql<
            string | number
          >`SUM(CAST(${orderItems.quantity} AS FLOAT) * CAST(${orderItems.price} AS FLOAT))`,
          totalOrders: sql<
            string | number
          >`COUNT(DISTINCT ${orderItems.order_id})`,
        })
        .from(orderItems)
        .leftJoin(products, eq(products.id, orderItems.product_id))
        .leftJoin(orders, eq(orders.id, orderItems.order_id))
        .where(
          notInArray(orders.status, [
            OrderStatus.CANCELLED,
            OrderStatus.PENDING,
          ]),
        )
        .groupBy(products.merchant_id);

      // 3. Map aggregation to merchant cards
      const revenueByMerchantMap = sales_data.reduce(
        (
          acc: Record<
            string,
            { totalRevenue: number; totalOrders: number; userId: string }
          >,
          row: {
            userId: number | null;
            totalRevenue: string | number | null;
            totalOrders: string | number | null;
          },
        ) => {
          const key = String(row.userId);
          acc[key] = {
            userId: key,
            totalRevenue: Number(row.totalRevenue) || 0,
            totalOrders: Number(row.totalOrders) || 0,
          };
          return acc;
        },
        {},
      );

      return merchants.map((merchant) => {
        const stats = revenueByMerchantMap[merchant.user_id];
        return {
          id: merchant.id,
          userId: merchant.user_id,
          shopName: merchant.shop_name || 'Unnamed Shop',
          managerName: merchant.manager_name || merchant.user?.name || 'N/A',
          phone: merchant.phone || 'N/A',
          city: merchant.city || 'N/A',
          image: merchant.image || merchant.user?.avatar || null,
          rating: Number(merchant.rating) || 0,
          reviewCount: merchant.review_count || 0,
          isTrusted: merchant.is_trusted || false,
          totalRevenue: Number(stats?.totalRevenue) || 0,
          totalOrders: Number(stats?.totalOrders) || 0,
          status: merchant.status,
        };
      });
    } catch (error) {
      console.error('Error in GetAdminMerchantSalesOverviewUseCase:', error);
      throw error;
    }
  }
}
