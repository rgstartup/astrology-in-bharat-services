import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';

@Injectable()
export class GetExpertReviewsUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) { }

  async execute(expertId: string, page: number = 1, limit: number = 20) {
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { expert_id: expertId as any },
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: reviews,
      total,
      page,
      limit,
    };
  }
}
