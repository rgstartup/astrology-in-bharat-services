import { Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';

@Injectable()
export class UpdateReviewStatusUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) { }

  async execute(id: string, status: string) {
    const result = await this.reviewRepository.update(id, { status });
    if (result.affected === 0) {
      throw new NotFoundException(`Review with id ${id} not found`);
    }
    return new BooleanMessage();
  }
}
