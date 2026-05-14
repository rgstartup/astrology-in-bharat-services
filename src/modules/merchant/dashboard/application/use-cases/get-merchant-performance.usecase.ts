import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '@/modules/consultation/reviews/infrastructure/entities/review.entity';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { OrderItem } from '@/modules/commerce/order/infrastructure/entities/order-item.entity';

import * as fs from 'fs';

@Injectable()
export class GetMerchantPerformanceUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProfileMerchant)
    private readonly profileRepo: Repository<ProfileMerchant>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
  ) {}

  async execute(userId: number) {
    const profile = await this.profileRepo.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        weeklyTargetProgress: 0,
        currentTier: 'Bronze',
        salesData: [],
      };
    }

    const merchantId = profile.id;

    // 1. Rating Stats
    const statsResult = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.merchant_id = :merchantId', { merchantId })
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .getRawOne();

    const distResult = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.merchant_id = :merchantId', { merchantId })
      .select('ROUND(r.rating)', 'rating')
      .addSelect('COUNT(r.id)', 'count')
      .groupBy('ROUND(r.rating)')
      .getRawMany();

    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    distResult.forEach((d) => {
      const rating = Math.round(Number(d.rating)).toString();
      if (distribution.hasOwnProperty(rating)) distribution[rating] = Number(d.count);
    });

    // 2. Sales Chart Data (Last 7 Days) - Use Raw Query for reliability
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const salesResult = await this.productRepo.query(`
      SELECT 
        TO_CHAR(oi.created_at, 'FMMon DD') as "date",
        SUM(oi.price * oi.quantity) as "revenue"
      FROM commerce.order_items oi
      INNER JOIN commerce.products p ON p.id = oi.product_id
      WHERE (p.merchant_id = $1 OR p.merchant_id = $2)
      AND oi.created_at >= $3
      GROUP BY TO_CHAR(oi.created_at, 'FMMon DD')
      ORDER BY MIN(oi.created_at) ASC
    `, [userId, merchantId, sevenDaysAgo]);

    console.log(`[PERFORMANCE_DEBUG] Fetching for userId: ${userId}, merchantId: ${merchantId}`);
    console.log(`[PERFORMANCE_DEBUG] Raw query items: ${salesResult.length}`);
    console.log(`[PERFORMANCE_DEBUG] Raw results:`, JSON.stringify(salesResult));

    // Map to 7-day structure
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      days.push(`${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getDate()}`);
    }

    const salesData = days.map(day => {
      const found = salesResult.find(s => s.date === day);
      return {
        date: day,
        sales: found ? parseFloat(found.revenue) : 0,
      };
    });

    console.log(`[PERFORMANCE_DEBUG] Final salesData:`, JSON.stringify(salesData));

    return {
      averageRating: parseFloat(Number(statsResult.avg || 0).toFixed(1)),
      totalReviews: Number(statsResult.count || 0),
      ratingDistribution: distribution,
      weeklyTargetProgress: 45,
      currentTier: profile.isVerified ? 'Silver' : 'Bronze',
      salesData,
    };
  }
}
