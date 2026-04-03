import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, ILike } from 'typeorm';
import { Review } from '../../infrastructure/persistence/entities/review.entity';

@Injectable()
export class GetAdminReviewsUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) { }

  async execute(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    ratingType?: string;
  }) {
    const { page = 1, limit = 15, status, search, ratingType } = params;

    const queryBuilder = this.reviewRepository.createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.expert', 'expert')
      .leftJoinAndSelect('expert.user', 'expertUser')
      .orderBy('review.created_at', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (status && status !== 'all') {
      queryBuilder.andWhere('review.status = :status', { status });
    }

    if (ratingType === 'good') {
      queryBuilder.andWhere('review.rating >= 4');
    } else if (ratingType === 'moderate') {
      queryBuilder.andWhere('review.rating = 3');
    } else if (ratingType === 'bad') {
      queryBuilder.andWhere('review.rating <= 2');
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR expertUser.name ILIKE :search OR review.comment ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [reviews, total] = await queryBuilder.getManyAndCount();

    return {
      reviews,
      total,
      page,
      limit,
    };
  }
}
