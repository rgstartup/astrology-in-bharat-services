import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '@/modules/reviews/infrastructure/persistence/entities/review.entity';
import { Product } from '@/modules/product/infrastructure/persistence/entities/product.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/persistence/entities/profile-merchant.entity';

@Injectable()
export class GetMerchantPerformanceUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProfileMerchant)
    private readonly profileRepo: Repository<ProfileMerchant>,
  ) {}

  async execute(userId: number) {
    // 1. Get Merchant Profile
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
      };
    }

    const merchantId = profile.id;

    // 2. Aggregate Rating Stats
    const statsResult = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.merchant_id = :merchantId', { merchantId })
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .getRawOne();

    // 3. Rating Distribution
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
      if (distribution.hasOwnProperty(rating)) {
        distribution[rating] = Number(d.count);
      }
    });

    // 4. Latest Review
    const latestReviewObj = await this.reviewRepo.findOne({
      where: { merchant_id: merchantId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });

    return {
      averageRating: parseFloat(Number(statsResult.avg || 0).toFixed(1)),
      totalReviews: Number(statsResult.count || 0),
      ratingDistribution: distribution,
      latestReview: latestReviewObj
        ? {
            text: latestReviewObj.comment,
            rating: latestReviewObj.rating,
            userName: latestReviewObj.user?.name || 'Anonymous',
          }
        : null,
      weeklyTargetProgress: 78, // Mocked for now
      currentTier: 'Gold', // Mocked for now
    };
  }
}
