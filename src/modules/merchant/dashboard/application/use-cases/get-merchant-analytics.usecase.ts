import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@/modules/product/infrastructure/persistence/entities/product.entity';
import { OrderItem } from '@/modules/order/infrastructure/persistence/entities/order-item.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/persistence/entities/profile-merchant.entity';

@Injectable()
export class GetMerchantAnalyticsUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(ProfileMerchant)
    private readonly profileRepo: Repository<ProfileMerchant>,
  ) {}

  async execute(userId: number) {
    const profile = await this.profileRepo.findOne({ where: { user_id: userId } });
    const merchantId = profile?.id || 0;

    // 1. Revenue Timeline (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const revenueResult = await this.productRepo.query(`
      SELECT 
        TO_CHAR(oi.created_at, 'FMMon DD') as date,
        SUM(oi.price * oi.quantity) as revenue
      FROM order_items oi
      INNER JOIN products p ON p.id = oi.product_id
      WHERE (p.merchant_id = $1 OR p.merchant_id = $2)
      AND oi.created_at >= $3
      GROUP BY TO_CHAR(oi.created_at, 'FMMon DD')
      ORDER BY MIN(oi.created_at) ASC
    `, [userId, merchantId, thirtyDaysAgo]);

    // 2. Top Selling Products
    const topProductsResult = await this.productRepo.query(`
      SELECT 
        p.name as "name",
        SUM(oi.quantity) as "sales_count",
        SUM(oi.price * oi.quantity) as "total_revenue"
      FROM order_items oi
      INNER JOIN products p ON p.id = oi.product_id
      WHERE (p.merchant_id = $1 OR p.merchant_id = $2)
      GROUP BY p.name
      ORDER BY sales_count DESC
      LIMIT 10
    `, [userId, merchantId]);

    const totalSales = topProductsResult.reduce((acc, curr) => acc + Number(curr.sales_count), 0);
    const topProducts = topProductsResult.map(p => ({
        name: p.name,
        sales: Number(p.sales_count),
        revenue: Number(p.total_revenue),
        percentage: totalSales > 0 ? Math.round((Number(p.sales_count) / totalSales) * 100) : 0
    }));

    // 3. Stock Levels - Check both IDs for safety
    const stockResult = await this.productRepo.query(`
        SELECT name, stock 
        FROM products 
        WHERE (merchant_id = $1 OR merchant_id = $2)
        ORDER BY stock ASC
        LIMIT 10
    `, [userId, merchantId]);

    console.log(`[ANALYTICS_DEBUG] userId: ${userId}, pItems: ${topProducts.length}, stockItems: ${stockResult.length}`);
    console.log(`[ANALYTICS_DEBUG] Stock Result Sample:`, JSON.stringify(stockResult.slice(0, 2)));

    return {
      revenueTimeline: revenueResult.map(r => ({ date: r.date, revenue: Number(r.revenue) })),
      topProducts,
      stockLevels: stockResult.map(p => ({
          name: p.name,
          stock: Number(p.stock),
          status: p.stock > 10 ? 'Healthy' : p.stock > 0 ? 'Low Stock' : 'Out of Stock'
      }))
    };
  }
}
