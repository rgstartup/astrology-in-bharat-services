import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';

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
    review_type?: string;
  }) {
    const { page = 1, limit = 15, status, search, ratingType, review_type } = params;

    const queryBuilder = this.reviewRepository.createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('user.profile_client', 'profile_client')
      .leftJoinAndSelect('review.expert', 'expert')
      .leftJoinAndSelect('expert.user', 'expertUser')
      .orderBy('review.created_at', 'DESC');

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

    if (review_type && review_type !== 'all') {
      queryBuilder.andWhere('review.review_type = :review_type', { review_type });
    }

    const [reviews, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:6543/';

    const mappedReviews = reviews.map(r => {
      const rawAvatar = r.user?.avatar || (r.user as any)?.profile_client?.profile_picture;
      const fullAvatar = rawAvatar 
        ? (rawAvatar.startsWith('http') ? rawAvatar : `${baseUrl.replace(/\/$/, '')}/${rawAvatar.replace(/^\//, '')}`)
        : null;

      return {
        ...r,
        user: r.user ? {
          ...r.user,
          avatar: fullAvatar
        } : null
      };
    });

    return {
      reviews: mappedReviews,
      total,
      page,
      limit,
    };
  }
}
