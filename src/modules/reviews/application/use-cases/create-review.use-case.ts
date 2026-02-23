import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/persistence/entities/review.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { ChatSession } from '@/modules/chat/infrastructure/persistence/entities/chat-session.entity';
import {
  ExpertNotFoundError,
  SessionNotFoundError,
  CannotReviewUnparticipatedSessionError,
  SessionAlreadyReviewedError,
} from '../../domain/errors/reviews.errors';

@Injectable()
export class CreateReviewUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ProfileExpert)
    private readonly expertRepository: Repository<ProfileExpert>,
    @InjectRepository(ChatSession)
    private readonly sessionRepository: Repository<ChatSession>,
  ) { }

  async execute(
    userId: number,
    dto: {
      expertId: number;
      sessionId?: number;
      rating: number;
      comment?: string;
    }
  ): Promise<Review> {
    const { expertId, sessionId, rating, comment } = dto;

    const expert = await this.expertRepository.findOne({ where: { id: expertId } });
    if (!expert) {
      throw new ExpertNotFoundError(expertId);
    }

    if (sessionId) {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
      });
      if (!session) {
        throw new SessionNotFoundError(sessionId);
      }
      if (session.user_id !== userId) {
        throw new CannotReviewUnparticipatedSessionError();
      }

      const existingReview = await this.reviewRepository.findOne({
        where: { session_id: sessionId },
      });
      if (existingReview) {
        throw new SessionAlreadyReviewedError();
      }
    }

    const review = this.reviewRepository.create({
      user_id: userId,
      expert_id: expertId,
      session_id: sessionId,
      rating,
      comment,
    });

    await this.reviewRepository.save(review);

    await this.updateExpertRating(expertId);

    return review;
  }

  private async updateExpertRating(expertId: number) {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.expert_id = :expertId', { expertId })
      .getRawOne();

    const averageRating = result.average ? parseFloat(result.average) : 0;
    const totalReviews = result.count ? parseInt(result.count, 10) : 0;

    await this.expertRepository.update(expertId, {
      rating: parseFloat(averageRating.toFixed(1)),
      total_reviews: totalReviews,
    });
  }
}
