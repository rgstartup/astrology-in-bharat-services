import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../domain/entities/review.entity';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { ProfileExpert } from '@/modules/expert';
import { ChatSession } from '@/modules/chat';
import { IReviewRepository } from '../../domain/repositories/review.repository.interface';
import { IExpertRepository } from '@/modules/expert/domain/repositories/expert.repository.interface';
import { IChatSessionRepository } from '@/modules/chat/domain/repositories/chat-session.repository.interface';

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(IReviewRepository)
    private reviewRepo: IReviewRepository,
    @Inject(IExpertRepository)
    private expertRepo: IExpertRepository,
    @Inject(IChatSessionRepository)
    private sessionRepo: IChatSessionRepository,
  ) { }

  async createReview(
    userId: number,
    dto: CreateReviewDto,
  ) {
    const { expertId, sessionId, rating, comment } = dto;

    // Verify Expert exists
    const expert = await this.expertRepo.findById(expertId);
    if (!expert) throw new NotFoundException('Expert not found');

    if (sessionId) {
      const session = await this.sessionRepo.findOne({
        where: { id: sessionId },
      });
      if (!session) throw new NotFoundException('Session not found');
      if (session.userId !== userId)
        throw new BadRequestException(
          'You can only review sessions you participated in',
        );

      // Check if already reviewed for this session
      const existingReview = await this.reviewRepo.findOne({
        where: { sessionId },
      });
      if (existingReview)
        throw new BadRequestException(
          'You have already submitted a review for this session',
        );
    }

    // Create Review
    const review = this.reviewRepo.create({
      userId,
      expertId,
      sessionId,
      rating,
      comment,
    });

    await this.reviewRepo.save(review);

    // Update Expert Rating
    await this.updateExpertRating(expertId);

    return review;
  }

  async getExpertReviews(
    expertId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: { expertId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
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

  async getReviewsStats(expertId: number) {
    const expert = await this.expertRepo.findById(expertId);
    if (!expert) return null;

    return {
      rating: expert.rating,
      totalReviews: expert.totalReviews,
    };
  }

  private async updateExpertRating(expertId: number) {
    const { average, count } = await this.reviewRepo.getAverageRatingAndCount(expertId);

    const expert = await this.expertRepo.findById(expertId);
    if (expert) {
      expert.rating = parseFloat(average.toFixed(1));
      expert.totalReviews = count;
      await this.expertRepo.save(expert);
    }
  }
}
