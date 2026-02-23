import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

@Injectable()
export class GetReviewsStatsUseCase {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly expertRepository: Repository<ProfileExpert>,
  ) { }

  async execute(expertId: number) {
    const expert = await this.expertRepository.findOne({ where: { id: expertId } });
    if (!expert) return null;

    return {
      rating: expert.rating,
      totalReviews: expert.total_reviews,
    };
  }
}
