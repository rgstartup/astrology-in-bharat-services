import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { MerchantProfileFacade } from '@/modules/merchant/profile/application/profile.facade';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';
import { ChatSession } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { CallSession } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { CreateReviewDto } from '../../api/dto/create-review.dto';

@Injectable()
export class CreateReviewUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ChatSession)
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(CallSession)
    private readonly callSessionRepository: Repository<CallSession>,
    @Inject(forwardRef(() => ExpertProfileFacade))
    private readonly expertProfileFacade: ExpertProfileFacade,
    @Inject(forwardRef(() => MerchantProfileFacade))
    private readonly merchantProfileFacade: MerchantProfileFacade,
    @Inject(forwardRef(() => OrderFacade))
    private readonly orderFacade: OrderFacade,
    private readonly dataSource: DataSource,
  ) {}

  async execute(clientId: string, dto: CreateReviewDto): Promise<Review> {
    const {
      expert_id,
      merchantId,
      orderId,
      sessionId,
      rating,
      comment,
      tags,
      review_type,
    } = dto;

    if (review_type === 'platform') {
      return this.handlePlatformReview(clientId, rating, comment, tags);
    }

    if (!expert_id && !merchantId) {
      throw new BadRequestException(
        'Either expert_id or merchantId must be provided for expert/shop reviews',
      );
    }

    if (expert_id) {
      return this.handleExpertReview(
        clientId,
        expert_id,
        sessionId ?? undefined,
        rating,
        comment,
        tags,
      );
    } else if (merchantId) {
      return this.handleMerchantReview(
        clientId,
        merchantId,
        orderId ?? undefined,
        rating,
        comment,
        tags,
      );
    } else {
      throw new BadRequestException(
        'Either expert_id or merchantId must be provided',
      );
    }
  }

  private async handlePlatformReview(
    clientId: string,
    rating: number,
    comment?: string,
    tags?: string[],
  ) {
    const review = this.reviewRepository.create({
      client_id: clientId,
      rating,
      comment,
      tags,
      review_type: 'platform',
      status: 'pending',
    });

    const savedReview = await this.reviewRepository.save(review);

    // Clean response for platform reviews
    const {
      expert_id: _expert_id,
      merchant_id: _merchant_id,
      order_id: _order_id,
      session_id: _session_id,
      call_session_id: _call_session_id,
      expert: _expert,
      merchant: _merchant,
      order: _order,
      session: _session,
      callSession: _callSession,
      ...cleanReview
    } = savedReview as unknown as Record<string, unknown>;

    return cleanReview as unknown as Review;
  }

  private async handleExpertReview(
    clientId: string,
    expert_id: string,
    sessionId: string | undefined,
    rating: number,
    comment?: string,
    tags?: string[],
  ) {
    const expert =
      (await this.expertProfileFacade.getExpertById(expert_id)) ||
      (await this.expertProfileFacade.getExpertByUserId(expert_id));
    if (!expert) throw new NotFoundException('Expert not found');

    // Ensure we use the actual primary ID for the rest of the logic
    const actualExpertId = expert.id;

    let chatSessionId: string | undefined = undefined;
    let callSessionId: string | undefined = undefined;

    if (sessionId) {
      // Check chat session first
      const chatSession = await this.chatSessionRepository.findOne({
        where: { id: sessionId as unknown as string },
      });
      if (chatSession) {
        chatSessionId = sessionId;
        // Check for duplicate review
        const existingReview = await this.reviewRepository.findOne({
          where: { session_id: sessionId as unknown as string },
        });
        if (existingReview)
          throw new BadRequestException('Session already reviewed');
      } else {
        // Try call session
        const callSession = await this.callSessionRepository.findOne({
          where: { id: sessionId as unknown as string },
        });
        if (callSession) {
          callSessionId = sessionId;
          const existingReview = await this.reviewRepository.findOne({
            where: { call_session_id: sessionId as unknown as string },
          });
          if (existingReview)
            throw new BadRequestException('Session already reviewed');
        }
      }
    }

    console.log('[CreateReview] Payload:', {
      clientId,
      expert_id,
      sessionId,
      rating,
      comment,
      tags,
    });

    const review = this.reviewRepository.create({
      client_id: clientId as unknown as string,
      expert: { id: actualExpertId } as unknown as Record<string, unknown>,
      session_id: chatSessionId ?? null,
      call_session_id: callSessionId ?? null,
      rating,
      comment,
      tags,
      review_type: 'expert',
    });

    console.log('[CreateReview] Review Object created:', review);

    try {
      const savedReview = await this.reviewRepository.save(review);
      console.log('[CreateReview] Review Saved:', savedReview.id);
      await this.updateExpertRating(actualExpertId as string);
      return savedReview;
    } catch (error) {
      console.error('[CreateReview] Error saving review:', error);
      throw error;
    }
  }

  private async handleMerchantReview(
    clientId: string,
    merchantId: string,
    orderId: string | undefined,
    rating: number,
    comment?: string,
    tags?: string[],
  ) {
    const merchant =
      (await this.merchantProfileFacade.getProfileById(merchantId)) ||
      (await this.merchantProfileFacade.getProfileByUserId(merchantId));
    if (!merchant) throw new NotFoundException('Merchant not found');

    const actualMerchantId = merchant.id;

    if (orderId) {
      // Use clientId (profile ID) to look up the order since orders are keyed to client_id
      const order = await this.orderFacade.getOrderById(orderId, clientId);

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException(
          'You can only review items from a delivered order',
        );
      }

      // Verify order contains products from this merchant
      const hasMerchantProduct = order.items.some(
        (item: { product?: { merchant_id?: string } }) =>
          item.product?.merchant_id === merchant.user_id ||
          item.product?.merchant_id === merchant.id,
      );
      if (!hasMerchantProduct) {
        throw new ForbiddenException(
          'This order does not contain products from this merchant',
        );
      }

      // Prevent duplicate review for same order and merchant
      const existingReview = await this.reviewRepository.findOne({
        where: {
          order_id: orderId as unknown as string,
          merchant_id: actualMerchantId,
        },
      });
      if (existingReview)
        throw new BadRequestException(
          'You have already reviewed this merchant for this order',
        );
    }

    const review = this.reviewRepository.create({
      client_id: clientId as unknown as string,
      merchant_id: actualMerchantId,
      order_id: orderId ?? null,
      rating,
      comment,
      tags,
      review_type: 'merchant',
    });

    const savedReview = await this.reviewRepository.save(review);
    await this.updateMerchantRating(actualMerchantId);
    return savedReview;
  }

  private async updateExpertRating(expert_id: string) {
    const result = (await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.expert_id = :expert_id', { expert_id })
      .getRawOne<{ average: string | null; count: string | null }>()) ?? {
      average: null,
      count: null,
    };

    const average = result.average
      ? parseFloat(parseFloat(result.average).toFixed(1))
      : 0;
    const count = result.count ? parseInt(result.count, 10) : 0;

    await this.dataSource
      .createQueryBuilder()
      .update('profile_expert')
      .set({ rating: average, total_reviews: count })
      .where('id = :expert_id', { expert_id })
      .execute();
  }

  private async updateMerchantRating(merchantId: string) {
    const result = (await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.merchant_id = :merchantId', { merchantId })
      .getRawOne<{ average: string | null; count: string | null }>()) ?? {
      average: null,
      count: null,
    };

    const average = result.average
      ? parseFloat(parseFloat(result.average).toFixed(1))
      : 0;
    const count = result.count ? parseInt(result.count, 10) : 0;

    await this.dataSource
      .createQueryBuilder()
      .update('profile_merchant')
      .set({ rating: average, reviewCount: count })
      .where('id = :merchantId', { merchantId })
      .execute();
  }
}
