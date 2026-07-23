import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';
import { Order, OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';
import { ChatSession } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { CallSession } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let resultReview: Review;

      if (review_type === 'platform') {
        resultReview = await this.handlePlatformReview(queryRunner.manager, clientId, rating, comment, tags);
      } else if (!expert_id && !merchantId) {
        throw new BadRequestException(
          'Either expert_id or merchantId must be provided for expert/shop reviews',
        );
      } else if (expert_id) {
        resultReview = await this.handleExpertReview(
          queryRunner.manager,
          clientId,
          expert_id,
          sessionId ?? undefined,
          rating,
          comment,
          tags,
        );
      } else if (merchantId) {
        resultReview = await this.handleMerchantReview(
          queryRunner.manager,
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

      await queryRunner.commitTransaction();
      return resultReview;
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async handlePlatformReview(
    manager: EntityManager,
    clientId: string,
    rating: number,
    comment?: string,
    tags?: string[],
  ) {
    const review = manager.create(Review, {
      client_id: clientId,
      rating,
      comment,
      tags,
      review_type: 'platform',
      status: 'pending',
    });

    const savedReview = await manager.save(Review, review);

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
    manager: EntityManager,
    clientId: string,
    expert_id: string,
    sessionId: string | undefined,
    rating: number,
    comment?: string,
    tags?: string[],
  ) {
    const expert = await manager.findOne(ProfileExpert, {
      where: [{ id: expert_id }, { user: { id: expert_id } }],
    });
    if (!expert) throw new NotFoundException('Expert not found');

    const actualExpertId = expert.id;

    let chatSessionId: string | undefined = undefined;
    let callSessionId: string | undefined = undefined;

    if (sessionId) {
      const chatSession = await manager.findOne(ChatSession, {
        where: { id: sessionId as unknown as string },
      });
      if (chatSession) {
        chatSessionId = sessionId;
        const existingReview = await manager.findOne(Review, {
          where: { session_id: sessionId as unknown as string },
        });
        if (existingReview)
          throw new BadRequestException('Session already reviewed');
      } else {
        const callSession = await manager.findOne(CallSession, {
          where: { id: sessionId as unknown as string },
        });
        if (callSession) {
          callSessionId = sessionId;
          const existingReview = await manager.findOne(Review, {
            where: { call_session_id: sessionId as unknown as string },
          });
          if (existingReview)
            throw new BadRequestException('Session already reviewed');
        }
      }
    }

    const review = manager.create(Review, {
      client_id: clientId as unknown as string,
      expert: { id: actualExpertId } as unknown as Record<string, unknown>,
      session_id: chatSessionId ?? null,
      call_session_id: callSessionId ?? null,
      rating,
      comment,
      tags,
      review_type: 'expert',
      status: 'approved',
    });

    try {
      const savedReview = await manager.save(Review, review);
      await this.updateExpertRating(manager, actualExpertId as string);
      return savedReview;
    } catch (error) {
      console.error('[CreateReview] Error saving review:', error);
      throw error;
    }
  }

  private async handleMerchantReview(
    manager: EntityManager,
    clientId: string,
    merchantId: string,
    orderId: string | undefined,
    rating: number,
    comment?: string,
    tags?: string[],
  ) {
    const merchant = await manager.findOne(ProfileMerchant, {
      where: [{ id: merchantId }, { user: { id: merchantId } }],
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const actualMerchantId = merchant.id;

    if (orderId) {
      const order = await manager.findOne(Order, {
        where: { id: orderId, client_id: clientId },
        relations: ['items', 'items.product'],
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException(
          'You can only review items from a delivered order',
        );
      }

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

      const existingReview = await manager.findOne(Review, {
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

    const review = manager.create(Review, {
      client_id: clientId as unknown as string,
      merchant_id: actualMerchantId,
      order_id: orderId ?? null,
      rating,
      comment,
      tags,
      review_type: 'merchant',
      status: 'approved',
    });

    const savedReview = await manager.save(Review, review);
    await this.updateMerchantRating(manager, actualMerchantId);
    return savedReview;
  }

  private async updateExpertRating(manager: EntityManager, expert_id: string) {
    const result = (await manager
      .createQueryBuilder(Review, 'review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.expert_id = :expert_id', { expert_id })
      .andWhere('review.status = :status', { status: 'approved' })
      .getRawOne<{ average: string | null; count: string | null }>()) ?? {
      average: null,
      count: null,
    };

    const average = result.average
      ? parseFloat(parseFloat(result.average).toFixed(1))
      : 0;
    const count = result.count ? parseInt(result.count, 10) : 0;

    await manager
      .createQueryBuilder()
      .update(ProfileExpert)
      .set({ rating: average, total_reviews: count })
      .where('id = :expert_id', { expert_id })
      .execute();
  }

  private async updateMerchantRating(manager: EntityManager, merchantId: string) {
    const result = (await manager
      .createQueryBuilder(Review, 'review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.merchant_id = :merchantId', { merchantId })
      .andWhere('review.status = :status', { status: 'approved' })
      .getRawOne<{ average: string | null; count: string | null }>()) ?? {
      average: null,
      count: null,
    };

    const average = result.average
      ? parseFloat(parseFloat(result.average).toFixed(1))
      : 0;
    const count = result.count ? parseInt(result.count, 10) : 0;

    await manager
      .createQueryBuilder()
      .update(ProfileMerchant)
      .set({ rating: average, reviewCount: count })
      .where('id = :merchantId', { merchantId })
      .execute();
  }
}
