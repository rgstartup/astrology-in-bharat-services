import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryBuilder, Repository, SelectQueryBuilder } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';

import { GetAdminReviewsDto } from '../../api/dto/get-admin-reviews.dto';

@Injectable()
export class GetAdminReviewsUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(
    dto: GetAdminReviewsDto,
  ) {
    const {
      page = 1,
      limit = 15,
      status,
      search,
      ratingType,
      review_type,
    } = dto;

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.client', 'client')
      .leftJoinAndSelect('client.user', 'user')
      .leftJoinAndSelect('review.expert', 'expert')
      .leftJoinAndSelect('expert.user', 'expertUser')
      .orderBy('review.created_at', 'DESC');

    if (status && status !== 'all') {
      queryBuilder.andWhere('review.status = :status', { status });
    }

    this.addRating(ratingType, queryBuilder)

    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR expertUser.name ILIKE :search OR review.comment ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (review_type && review_type !== 'all') {
      queryBuilder.andWhere('review.review_type = :review_type', {
        review_type,
      });
    }

    const [reviews, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:6543/';

    const mappedReviews = reviews.map((r) => {
      const rawAvatar =
        r.client?.avatar ||
        ((
          (r.client as unknown as Record<string, unknown>)?.profile_client as
            | Record<string, unknown>
            | undefined
        )?.profile_picture as string | undefined);
      const fullAvatar =
        typeof rawAvatar === 'string'
          ? rawAvatar.startsWith('http')
            ? rawAvatar
            : `${baseUrl.replace(/\/$/, '')}/${rawAvatar.replace(/^\//, '')}`
          : null;

      return {
        ...r,
        client: r.client
          ? {
              ...r.client,
              avatar: fullAvatar,
            }
          : null,
      };
    });

    return {
      reviews: mappedReviews,
      total,
      page,
      limit,
    };
  }


  private addRating(rating_type: string | undefined, queryBuilder: SelectQueryBuilder<Review>){
    if(!rating_type || rating_type === 'all') return queryBuilder;
    if(rating_type === 'good') return queryBuilder.andWhere('review.rating >= 4');
    if(rating_type === 'moderate') return queryBuilder.andWhere('review.rating = 3');
    if(rating_type === 'bad') return queryBuilder.andWhere('review.rating <= 2');
    return queryBuilder;
  }
}
