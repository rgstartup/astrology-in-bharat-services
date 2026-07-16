import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewsFacade } from '@/modules/consultation/reviews/application/reviews.facade';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Injectable()
export class GetMerchantPerformanceUseCase {
  constructor(
    @Inject(forwardRef(() => ReviewsFacade))
    private readonly reviewsFacade: ReviewsFacade,
    private readonly orderFacade: OrderFacade,
    @InjectRepository(ProfileMerchant)
    private readonly profileRepo: Repository<ProfileMerchant>,
  ) {}

  async execute(userId: string) {
    const merchantId = userId;

    // 1. Rating Stats
    const statsResult =
      await this.reviewsFacade.getMerchantReviewsStats(merchantId);

    const distribution = statsResult?.distribution || {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0,
    };

    // 2. Sales Chart Data (Last 7 Days)
    const salesResult = (await this.orderFacade.getMerchantRevenueTimeline(
      merchantId,
    )) as Array<{ date: string; revenue: string | number }>;

    // 3. Growth Rate: current month vs last month
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [currentMonthEarnings, lastMonthEarnings] = await Promise.all([
      this.orderFacade.getMerchantGrossMonthlyEarnings(merchantId, startOfCurrentMonth).catch(() => 0),
      this.orderFacade.getMerchantGrossMonthlyEarnings(merchantId, startOfLastMonth, endOfLastMonth).catch(() => 0),
    ]);

    let growthRate = '+0.0%';
    if (lastMonthEarnings > 0) {
      const pct = ((currentMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100;
      growthRate = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    } else if (currentMonthEarnings > 0) {
      growthRate = '+100.0%'; // First month with earnings
    }

    // Map to 7-day structure
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      days.push(
        `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getDate()}`,
      );
    }

    const sales_data = days.map((day) => {
      const found = salesResult.find((s) => s.date === day);
      return {
        date: day,
        sales: found ? parseFloat(String(found.revenue)) : 0,
      };
    });

    const profile = await this.profileRepo.findOne({
      where: { user_id: userId },
    });

    return {
      average_rating: statsResult?.average_rating || 0,
      totalReviews: statsResult?.totalReviews || 0,
      rating_distribution: distribution,
      weekly_target_progress: 45,
      current_tier: profile?.isVerified ? 'Silver' : 'Bronze',
      sales_data,
      growthRate,
      currentMonthEarnings,
      lastMonthEarnings,
    };
  }
}
