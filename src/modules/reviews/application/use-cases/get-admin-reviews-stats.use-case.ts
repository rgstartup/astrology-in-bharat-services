import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/persistence/entities/review.entity';

@Injectable()
export class GetAdminReviewsStatsUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) { }

  async execute() {
    const total = await this.reviewRepository.count();

    const goodCount = await this.reviewRepository.createQueryBuilder('review')
      .where('review.rating >= :rating', { rating: 4 })
      .getCount();

    const moderateCount = await this.reviewRepository.createQueryBuilder('review')
      .where('review.rating = :rating', { rating: 3 })
      .getCount();

    const badCount = await this.reviewRepository.createQueryBuilder('review')
      .where('review.rating <= :rating', { rating: 2 })
      .getCount();

    return {
      total,
      good: goodCount,
      moderate: moderateCount,
      bad: badCount,
    };
  }
}
