import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { Review } from '../../infrastructure/entities/review.entity';

@Injectable()
export class GetReviewsStatsUseCase {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly expertRepository: Repository<ProfileExpert>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) { }

  async execute(expertId: number) {
    const expert = await this.expertRepository.findOne({ where: { id: expertId } });
    if (!expert) return null;

    // Get star-wise distribution counts
    const countsResult = await this.reviewRepository
      .createQueryBuilder('review')
      .select('CAST(review.rating AS INTEGER)', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.expert_id = :expertId', { expertId })
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

    countsResult.forEach((row) => {
      const ratingKey = row.rating.toString();
      if (counts.hasOwnProperty(ratingKey)) {
        counts[ratingKey] = parseInt(row.count, 10);
      }
    });

    return {
      rating: expert.rating,
      totalReviews: expert.total_reviews,
      counts,
    };
  }
}
