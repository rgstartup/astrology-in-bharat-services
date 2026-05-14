import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { Order, OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';
import { ChatSession } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { CallSession } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
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
    const { expertId, merchantId, orderId, sessionId, rating, comment, tags, review_type } = dto;

    if (review_type === 'platform') {
      return this.handlePlatformReview(userId, rating, comment, tags);
    }

    if (!expertId && !merchantId) {
      throw new BadRequestException('Either expertId or merchantId must be provided for expert/shop reviews');
    }

    if (expertId) {
      return this.handleExpertReview(userId, expertId, sessionId ?? 0, rating, comment, tags);
    } else if (merchantId) {
      return this.handleMerchantReview(userId, merchantId, orderId ?? 0, rating, comment, tags);
    } else {
      throw new BadRequestException('Either expertId or merchantId must be provided');
    }
  }

  private async handlePlatformReview(userId: number, rating: number, comment?: string, tags?: string[]) {
    const review = this.reviewRepository.create({
      user_id: userId,
      rating,
      comment,
      tags,
      review_type: 'platform',
      status: 'pending',
    });

    const savedReview = await this.reviewRepository.save(review);
    
    // Clean response for platform reviews
    const { 
      expert_id, merchant_id, order_id, session_id, call_session_id, 
      expert, merchant, order, session, callSession,
      ...cleanReview 
    } = savedReview as any;
    
    return cleanReview;
  }

  private async handleExpertReview(userId: number, expertId: number, sessionId: number, rating: number, comment?: string, tags?: string[]) {
    // Try lookup by primary ID first, then by user_id
    const expert = await this.expertRepository.findOne({ 
      where: [{ id: expertId }, { user_id: expertId }] 
    });
    if (!expert) throw new NotFoundException('Expert not found');
    
    // Ensure we use the actual primary ID for the rest of the logic
    const actualExpertId = expert.id;

    let chatSessionId: number | undefined = undefined;
    let callSessionId: number | undefined = undefined;

    if (sessionId) {
      const chatSession = await this.chatSessionRepository.findOne({ where: { id: sessionId } });
      if (chatSession && chatSession.user_id === userId && chatSession.expert_id === actualExpertId) {
        chatSessionId = sessionId;
      } else {
        const callSession = await this.callSessionRepository.findOne({ where: { id: sessionId } });
        if (callSession && callSession.user_id === userId && callSession.expert_id === actualExpertId) {
          callSessionId = sessionId;
        }
      }

      if (!chatSessionId && !callSessionId) {
        throw new ForbiddenException('You can only review sessions you participated in');
      }

      // Use an explicit query object to satisfy TypeScript
      const queryCondition: any = chatSessionId 
        ? { session_id: chatSessionId } 
        : { call_session_id: callSessionId };

      const existingReview = await this.reviewRepository.findOne({
        where: queryCondition
      });
      if (existingReview) throw new BadRequestException('Session already reviewed');
    }

    console.log('[CreateReview] Payload:', { userId, expertId, sessionId, rating, comment, tags });

    const review = this.reviewRepository.create({
      user_id: userId,
      expert: { id: actualExpertId } as any,
      session_id: chatSessionId,
      call_session_id: callSessionId,
      rating,
      comment,
      tags,
      review_type: 'expert',
    });

    console.log('[CreateReview] Review Object created:', review);

    try {
      const savedReview = await this.reviewRepository.save(review);
      console.log('[CreateReview] Review Saved:', savedReview.id);
      await this.updateExpertRating(actualExpertId);
      return savedReview;
    } catch (error) {
      console.error('[CreateReview] Error saving review:', error);
      throw error;
    }
  }

  private async handleMerchantReview(userId: number, merchantId: number, orderId: number, rating: number, comment?: string, tags?: string[]) {
    // Try lookup by primary ID first, then by user_id
    const merchant = await this.merchantRepository.findOne({ 
      where: [{ id: merchantId }, { user_id: merchantId }] 
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    
    const actualMerchantId = merchant.id;

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
        where: { order_id: orderId, merchant_id: actualMerchantId }
      });
      if (existingReview) throw new BadRequestException('You have already reviewed this merchant for this order');
    }

    const review = this.reviewRepository.create({
      user_id: userId,
      merchant_id: actualMerchantId,
      order_id: orderId || null,
      rating,
      comment,
      tags,
      review_type: 'merchant',
    });

    const savedReview = await this.reviewRepository.save(review);
    await this.updateMerchantRating(actualMerchantId);
    return savedReview;
  }

  private async updateExpertRating(expertId: number) {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.expert_id = :expertId', { expertId })
      .getRawOne();

    const average = result?.average ? parseFloat(parseFloat(result.average).toFixed(1)) : 0;
    const count = result?.count ? parseInt(result.count, 10) : 0;

    await this.expertRepository.update(expertId, {
      rating: average,
      total_reviews: count,
    });
  }

  private async updateMerchantRating(merchantId: number) {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.merchant_id = :merchantId', { merchantId })
      .getRawOne();

    const average = result?.average ? parseFloat(parseFloat(result.average).toFixed(1)) : 0;
    const count = result?.count ? parseInt(result.count, 10) : 0;

    await this.merchantRepository.update(merchantId, {
      rating: average,
      reviewCount: count,
    });
  }
}
