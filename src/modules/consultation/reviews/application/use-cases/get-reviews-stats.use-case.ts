import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { Review } from '../../infrastructure/entities/review.entity';

@Injectable()
export class GetReviewsStatsUseCase {
  constructor(
    @Inject(forwardRef(() => ExpertProfileFacade))
    private readonly expertProfileFacade: ExpertProfileFacade,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(expert_id: string) {
    const expert =
      (await this.expertProfileFacade.getExpertById(expert_id)) ||
      (await this.expertProfileFacade.getExpertByUserId(expert_id));
    if (!expert) return null;

    // Get star-wise distribution counts
    const result: unknown = await this.reviewRepository
      .createQueryBuilder('review')
      .select('CAST(review.rating AS INTEGER)', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.expert_id = :expert_id', { expert_id: String(expert.id) })
      .andWhere('review.status = :status', { status: 'approved' })
      .groupBy('review.rating')
      .getRawMany();

    // Initialize counts for all stars 1 to 5
    const counts = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };

    let calculatedTotalReviews = 0;
    let sumRatings = 0;

    const countsResult = result as Array<Record<string, string>>;
    countsResult.forEach((row) => {
      const ratingKey = row.rating.toString();
      if (Object.prototype.hasOwnProperty.call(counts, ratingKey)) {
        const count = parseInt(row.count, 10);
        counts[ratingKey] = count;
        calculatedTotalReviews += count;
        sumRatings += (parseInt(ratingKey, 10) * count);
      }
    });

    const averageRating = calculatedTotalReviews > 0 ? sumRatings / calculatedTotalReviews : 0;

    return {
      rating: Number(averageRating.toFixed(1)),
      totalReviews: calculatedTotalReviews,
      counts,
    };
  }
}
