import { Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';

@Injectable()
export class DeleteReviewUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(id: string) {
    const result = await this.reviewRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Review with id ${id} not found`);
    }
    return new BooleanMessage(true, 'Review deleted successfully');
  }
}
