import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';

@Injectable()
export class GetMerchantReviewsStatsUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async execute(merchantId: string) {
    const statsResult = (await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.merchant_id = :merchantId', { merchantId })
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .getRawOne<{ avg: string | null; count: string | null }>()) ?? {
      avg: null,
      count: null,
    };

    const distResult = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.merchant_id = :merchantId', { merchantId })
      .select('ROUND(r.rating)', 'rating')
      .addSelect('COUNT(r.id)', 'count')
      .groupBy('ROUND(r.rating)')
      .getRawMany<{ rating: string | number; count: string | number }>();

    const distribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    distResult.forEach((d) => {
      const rating = Math.round(Number(d.rating)).toString();
      if (Object.prototype.hasOwnProperty.call(distribution, rating))
        distribution[rating] = Number(d.count);
    });

    return {
      average_rating: parseFloat(Number(statsResult.avg ?? 0).toFixed(1)),
      totalReviews: Number(statsResult.count ?? 0),
      distribution,
    };
  }
}
