import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/persistence/entities/review.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { ChatSession } from '@/modules/chat/infrastructure/persistence/entities/chat-session.entity';
import { CallSession } from '@/modules/call/infrastructure/persistence/entities/call-session.entity';
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
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(CallSession)
    private readonly callSessionRepository: Repository<CallSession>,
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

    let chatSessionId: number | null = null;
    let callSessionId: number | null = null;

    if (sessionId) {
      let sessionUser: number | null = null;
      let sessionExpert: number | null = null;
      
      const chatSession = await this.chatSessionRepository.findOne({
        where: { id: sessionId },
      });
      if (chatSession) {
        sessionUser = chatSession.user_id;
        sessionExpert = chatSession.expert_id;
        chatSessionId = sessionId;
      }

      if (!sessionUser) {
        const callSession = await this.callSessionRepository.findOne({
          where: { id: sessionId },
        });
        if (callSession) {
          sessionUser = callSession.user_id;
          sessionExpert = callSession.expert_id;
          callSessionId = sessionId;
        }
      }

      if (!sessionUser) {
        throw new SessionNotFoundError(sessionId);
      }
      
      // Ensure that user actually participated in the session that corresponds to the given expert
      if (sessionUser !== userId || sessionExpert !== expertId) {
        throw new CannotReviewUnparticipatedSessionError();
      }

      const queryCondition: any = chatSessionId ? { session_id: chatSessionId } : { call_session_id: callSessionId };
      const existingReview = await this.reviewRepository.findOne({
        where: queryCondition,
      });
      if (existingReview) {
        throw new SessionAlreadyReviewedError();
      }
    }

    const review = this.reviewRepository.create({
      user_id: userId,
      expert_id: expertId,
      session_id: chatSessionId,
      call_session_id: callSessionId,
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
