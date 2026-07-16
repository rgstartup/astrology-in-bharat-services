import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';

import { GetReviewsDto } from '../../api/dto/get-reviews.dto';

@Injectable()
export class GetExpertReviewsUseCase {
  constructor(
    @Inject(forwardRef(() => ExpertProfileFacade))
    private readonly expertProfileFacade: ExpertProfileFacade,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(
    expert_id: string,
    dto: GetReviewsDto,
  ) {
    const { page = 1, limit = 20 } = dto;
    const expert =
      (await this.expertProfileFacade.getExpertById(expert_id)) ||
      (await this.expertProfileFacade.getExpertByUserId(expert_id));

    if (!expert) {
      return {
        data: [],
        total: 0,
        page,
        limit,
      };
    }

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { expert_id: String(expert.id), status: 'approved' },
      relations: ['client', 'client.user'],
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
