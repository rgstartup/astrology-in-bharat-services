import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';

import { GetReviewsDto } from '../../api/dto/get-reviews.dto';

@Injectable()
export class GetMerchantReviewsUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(
    merchantId: string,
    dto: GetReviewsDto,
  ) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { merchant_id: merchantId, status: 'approved' }, // Assuming 'active' is the status for approved reviews
      relations: ['client', 'client.user'],
      take: limit,
      skip: skip,
      order: { created_at: 'DESC' },
    });

    const formattedReviews = reviews.map((r) => ({
      name: r.client?.name || 'Anonymous',
      img: r.client?.avatar,
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
