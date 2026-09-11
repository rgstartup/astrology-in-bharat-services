import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import { GetReviewsDto } from '../dto/get-reviews.dto';

import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';

@Injectable()
export class GetMerchantReviewsUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(merchantId: string, dto: GetReviewsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
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

    return PaginatedResponseDto.from(formattedReviews, total, { page, limit });
  }
}

