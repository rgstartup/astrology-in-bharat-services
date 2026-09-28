import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import { ExpertProfileService } from '@/internal/domains/expert/profile/profile.service';
import { GetReviewsDto } from '../dto/get-reviews.dto';

@Injectable()
export class GetExpertReviewsUseCase {
  constructor(
    @Inject(forwardRef(() => ExpertProfileService))
    private readonly expertProfileService: ExpertProfileService,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(expert_id: number, dto: GetReviewsDto) {
    const { page = 1, limit = 20 } = dto;
    const expert =
      (await this.expertProfileService.getExpertById(expert_id)) ||
      (await this.expertProfileService.getExpertByUserId(expert_id));

    if (!expert) {
      return {
        data: [],
        total: 0,
        page,
        limit,
      };
    }

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { expert_id: expert.id as number, status: 'approved' },
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
