import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';

@Injectable()
export class GetMerchantReviewsUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(merchantId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { merchant_id: merchantId, status: 'active' }, // Assuming 'active' is the status for approved reviews
      relations: ['user'],
      take: limit,
      skip: skip,
      order: { created_at: 'DESC' },
    });

    const formattedReviews = reviews.map((r) => ({
      name: r.user?.name || 'Anonymous',
      img: r.user?.avatar,
      rating: r.rating,
      text: r.comment,
      createdAt: r.created_at,
    }));

    return {
      success: true,
      data: formattedReviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
