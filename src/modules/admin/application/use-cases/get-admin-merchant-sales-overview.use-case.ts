// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { OrderItem } from '@/modules/commerce/order/infrastructure/entities/order-item.entity';
import { OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';

@Injectable()
export class GetAdminMerchantSalesOverviewUseCase {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async execute() {
    try {
      // 1. Fetch all merchants
      const merchants = await this.merchantRepository
        .createQueryBuilder('merchant')
        .leftJoinAndSelect('merchant.user', 'user')
        .getMany();

      // 2. Aggregate sales data per merchant (grouped by user_id)
      const salesData = await this.orderItemRepository
        .createQueryBuilder('item')
        .leftJoin('item.product', 'product')
        .leftJoin('item.order', 'order')
        .select('product.merchant_id', 'userId')
        .addSelect('SUM(CAST(item.quantity AS FLOAT) * CAST(item.price AS FLOAT))', 'totalRevenue')
        .addSelect('COUNT(DISTINCT item.order_id)', 'totalOrders')
        .where('order.status NOT IN (:...invalidStatuses)', { 
          invalidStatuses: [OrderStatus.CANCELLED, OrderStatus.PENDING] 
        })
        .groupBy('product.merchant_id')
        .getRawMany();

      // 3. Map aggregation to merchant cards
      return merchants.map((merchant) => {
        const stats = salesData.find((s) => Number(s.userId) === merchant.user_id);
        return {
          id: merchant.id,
          userId: merchant.user_id,
          shopName: merchant.shopName || 'Unnamed Shop',
          managerName: merchant.managerName || merchant.user?.name || 'N/A',
          phone: merchant.phone || 'N/A',
          city: merchant.city || 'N/A',
          image: merchant.image || merchant.user?.avatar || null,
          rating: Number(merchant.rating) || 0,
          reviewCount: merchant.reviewCount || 0,
          isTrusted: merchant.isTrusted || false,
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
