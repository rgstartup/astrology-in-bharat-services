import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';
import { ChatSession } from '@/modules/chat/entities/chat-session.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
    @InjectRepository(ProfileExpert)
    private expertRepo: Repository<ProfileExpert>,
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
  ) {}

  async createReview(
    userId: number,
    dto: {
      expertId: number;
      sessionId?: number;
      rating: number;
      comment?: string;
    },
  ) {
    const { expertId, sessionId, rating, comment } = dto;

    // Verify Expert exists
    const expert = await this.expertRepo.findOne({ where: { id: expertId } });
    if (!expert) throw new NotFoundException('Expert not found');

    // Optional: Verify Session if provided
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
    const expert = await this.expertRepo.findOne({ where: { id: expertId } });
    if (!expert) return null;

    return {
      rating: expert.rating,
      totalReviews: expert.totalReviews,
    };
  }

  private async updateExpertRating(expertId: number) {
    const result = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.expertId = :expertId', { expertId })
      .getRawOne();

    const averageRating = result.average ? parseFloat(result.average) : 0;
    const totalReviews = result.count ? parseInt(result.count, 10) : 0;

    await this.expertRepo.update(expertId, {
      rating: parseFloat(averageRating.toFixed(1)),
      totalReviews: totalReviews,
    });
  }
}
