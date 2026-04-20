import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { OrderItem } from '@/modules/order/infrastructure/persistence/entities/order-item.entity';
import { Product } from '@/modules/product/infrastructure/persistence/entities/product.entity';

@Injectable()
export class GetMerchantStatsUseCase {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async execute(userId: number) {
    console.log('[DASHBOARD_STATS] Request for userId:', userId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 1. Total Orders - Lifetime (Distinct order_id where product.merchant_id = userId)
    const totalOrdersQuery = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.product', 'p')
      .where('p.merchant_id = :userId', { userId })
      .select('COUNT(DISTINCT oi.order_id)', 'count')
      .getRawOne();

    // 2. Total Products
    const totalProducts = await this.productRepo.count({
      where: { merchant_id: userId },
    });

    // 3. Monthly Earnings (Sum of price * quantity where product.merchant_id = userId for current month)
    const monthlyEarningsQuery = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.product', 'p')
      .where('p.merchant_id = :userId', { userId })
      .andWhere('oi.created_at >= :startOfMonth', { startOfMonth })
      .select('SUM(oi.price * oi.quantity)', 'sum')
      .getRawOne();

    // 4. Total Earnings (Sum of price * quantity where product.merchant_id = userId)
    const totalEarningsQuery = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.product', 'p')
      .where('p.merchant_id = :userId', { userId })
      .select('SUM(oi.price * oi.quantity)', 'sum')
      .getRawOne();

    const result = {
      totalOrders: { value: Number(totalOrdersQuery.count) || 0, trend: '+10%' },
      totalProducts: { value: totalProducts, trend: '+2 new' },
      totalEarnings: {
        value: Number(totalEarningsQuery.sum) || 0,
        trend: '+15%',
      },
      monthlyEarnings: {
        value: Number(monthlyEarningsQuery.sum) || 0,
        trend: '+8%',
      },
    };
    console.log('[DASHBOARD_STATS] Result:', result);
    return result;
  }
}
