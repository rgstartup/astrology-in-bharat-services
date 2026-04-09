import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from '../../infrastructure/persistence/entities/review.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/persistence/entities/profile-merchant.entity';
import { Order, OrderStatus } from '@/modules/order/infrastructure/persistence/entities/order.entity';
import { ChatSession } from '@/modules/chat/infrastructure/persistence/entities/chat-session.entity';
import { CallSession } from '@/modules/call/infrastructure/persistence/entities/call-session.entity';
import { CreateReviewDto } from '../../api/dto/create-review.dto';

@Injectable()
export class CreateReviewUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ProfileExpert)
    private readonly expertRepository: Repository<ProfileExpert>,
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(ChatSession)
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(CallSession)
    private readonly callSessionRepository: Repository<CallSession>,
    private readonly dataSource: DataSource,
  ) { }

  async execute(userId: number, dto: CreateReviewDto): Promise<Review> {
    const { expertId, merchantId, orderId, sessionId, rating, comment } = dto;

    if (!expertId && !merchantId) {
      throw new BadRequestException('Either expertId or merchantId must be provided');
    }

    if (expertId) {
      return this.handleExpertReview(userId, expertId, sessionId ?? 0, rating, comment);
    } else if (merchantId) {
      return this.handleMerchantReview(userId, merchantId, orderId ?? 0, rating, comment);
    } else {
      throw new BadRequestException('Either expertId or merchantId must be provided');
    }
  }

  private async handleExpertReview(userId: number, expertId: number, sessionId: number, rating: number, comment?: string) {
    const expert = await this.expertRepository.findOne({ where: { id: expertId } });
    if (!expert) throw new NotFoundException('Expert not found');

    let chatSessionId: number | null = null;
    let callSessionId: number | null = null;

    if (sessionId) {
      const chatSession = await this.chatSessionRepository.findOne({ where: { id: sessionId } });
      if (chatSession && chatSession.user_id === userId && chatSession.expert_id === expertId) {
        chatSessionId = sessionId;
      } else {
        const callSession = await this.callSessionRepository.findOne({ where: { id: sessionId } });
        if (callSession && callSession.user_id === userId && callSession.expert_id === expertId) {
          callSessionId = sessionId;
        }
      }

      if (!chatSessionId && !callSessionId) {
        throw new ForbiddenException('You can only review sessions you participated in');
      }

      const existingReview = await this.reviewRepository.findOne({
        where: chatSessionId ? { session_id: chatSessionId } : { call_session_id: callSessionId as number }
      });
      if (existingReview) throw new BadRequestException('Session already reviewed');
    }

    const review = this.reviewRepository.create({
      user_id: userId,
      expert_id: expertId,
      session_id: chatSessionId,
      call_session_id: callSessionId,
      rating,
      comment,
    });

    const savedReview = await this.reviewRepository.save(review);
    await this.updateExpertRating(expertId);
    return savedReview;
  }

  private async handleMerchantReview(userId: number, merchantId: number, orderId: number, rating: number, comment?: string) {
    const merchant = await this.merchantRepository.findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (orderId) {
      const order = await this.orderRepository.findOne({ 
        where: { id: orderId, user_id: userId },
        relations: ['items', 'items.product']
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException('You can only review items from a delivered order');
      }

      // Verify order contains products from this merchant
      const hasMerchantProduct = order.items.some(item => item.product.merchant_id === merchant.user_id);
      if (!hasMerchantProduct) {
        throw new ForbiddenException('This order does not contain products from this merchant');
      }

      // Prevent duplicate review for same order and merchant
      const existingReview = await this.reviewRepository.findOne({
        where: { order_id: orderId, merchant_id: merchantId }
      });
      if (existingReview) throw new BadRequestException('You have already reviewed this merchant for this order');
    }

    const review = this.reviewRepository.create({
      user_id: userId,
      merchant_id: merchantId,
      order_id: orderId || null,
      rating,
      comment,
    });

    const savedReview = await this.reviewRepository.save(review);
    await this.updateMerchantRating(merchantId);
    return savedReview;
  }

  private async updateExpertRating(expertId: number) {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.expert_id = :expertId', { expertId })
      .getRawOne();

    await this.expertRepository.update(expertId, {
      rating: parseFloat(parseFloat(result.average || 0).toFixed(1)),
      total_reviews: parseInt(result.count || 0, 10),
    });
  }

  private async updateMerchantRating(merchantId: number) {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.merchant_id = :merchantId', { merchantId })
      .getRawOne();

    await this.merchantRepository.update(merchantId, {
      rating: parseFloat(parseFloat(result.average || 0).toFixed(1)),
      reviewCount: parseInt(result.count || 0, 10),
    });
  }
}
