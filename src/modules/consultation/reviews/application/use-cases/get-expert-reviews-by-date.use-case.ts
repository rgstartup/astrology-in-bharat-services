import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';

@Injectable()
export class GetExpertReviewsByDateUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async execute(expert_id: string, startDate: Date, endDate: Date) {
    return this.reviewRepo.find({
      where: {
        expert_id: expert_id,
        created_at: Between(startDate, endDate),
      },
    });
  }
}
