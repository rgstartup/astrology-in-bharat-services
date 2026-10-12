import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { and, count, eq, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb, DrizzleTx } from '@/core/drizzledb/drizzle.types';
import {
  callSessions,
  consultationSessions,
  expertAccounts,
  merchantAccounts,
  orders,
  reviews,
} from '@/core/drizzledb/schema';
import { OrderStatus } from '../../../commerce/order/enum';
import { CreateReviewDto } from '../dto/create-review.dto';
import { type ReviewDomain, toReviewDomain } from '../reviews.mapper';

@Injectable()
export class CreateReviewUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, dto: CreateReviewDto): Promise<ReviewDomain> {
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

    return this.db.transaction(async (tx) => {
      if (review_type === 'platform') {
        return this.handlePlatformReview(
          tx,
          clientId,
          rating,
          comment,
          tags,
        );
      } else if (!expert_id && !merchantId) {
        throw new BadRequestException(
          'Either expert_id or merchantId must be provided for expert/shop reviews',
        );
      } else if (expert_id) {
        return this.handleExpertReview(
          tx,
          clientId,
          expert_id,
          sessionId ?? undefined,
          rating,
          comment,
          tags,
        );
      } else if (merchantId) {
        return this.handleMerchantReview(
          tx,
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
    });
  }

  private async handlePlatformReview(
    tx: DrizzleTx,
    clientId: number,
    rating: number,
    comment?: string,
    tags?: string[],
  ): Promise<ReviewDomain> {
    const [savedReview] = await tx
      .insert(reviews)
      .values({
        client_id: clientId,
        rating,
        comment,
        tags: tags ? tags.join(',') : null,
        review_type: 'platform',
        status: 'pending',
      })
      .returning();

    return toReviewDomain(savedReview);
  }

  private async handleExpertReview(
    tx: DrizzleTx,
    clientId: number,
    expert_id: number,
    sessionId: number | undefined,
    rating: number,
    comment?: string,
    tags?: string[],
  ): Promise<ReviewDomain> {
    const expert = await tx.query.expertAccounts.findFirst({
      where: or(
        eq(expertAccounts.id, expert_id),
        eq(expertAccounts.user_id, expert_id),
      ),
    });
    if (!expert) throw new NotFoundException('Expert not found');

    const actualExpertId = expert.id;

    let chatSessionId: number | undefined = undefined;
    let callSessionId: number | undefined = undefined;

    if (sessionId) {
      const chatSession = await tx.query.consultationSessions.findFirst({
        where: eq(consultationSessions.id, sessionId),
      });
      if (chatSession) {
        chatSessionId = sessionId;
        const existingReview = await tx.query.reviews.findFirst({
          where: eq(reviews.session_id, sessionId),
        });
        if (existingReview) {
          throw new BadRequestException('Session already reviewed');
        }
      } else {
        const callSession = await tx.query.callSessions.findFirst({
          where: eq(callSessions.id, sessionId),
        });
        if (callSession) {
          callSessionId = sessionId;
          const existingReview = await tx.query.reviews.findFirst({
            where: eq(reviews.call_session_id, sessionId),
          });
          if (existingReview) {
            throw new BadRequestException('Session already reviewed');
          }
        }
      }
    }

    const [savedReview] = await tx
      .insert(reviews)
      .values({
        client_id: clientId,
        expert_id: actualExpertId,
        session_id: chatSessionId ?? null,
        call_session_id: callSessionId ?? null,
        rating,
        comment,
        tags: tags ? tags.join(',') : null,
        review_type: 'expert',
        status: 'approved',
      })
      .returning();

    await this.updateExpertRating(tx, actualExpertId);
    return toReviewDomain(savedReview);
  }

  private async handleMerchantReview(
    tx: DrizzleTx,
    clientId: number,
    merchantId: number,
    orderId: number | undefined,
    rating: number,
    comment?: string,
    tags?: string[],
  ): Promise<ReviewDomain> {
    const merchant = await tx.query.merchantAccounts.findFirst({
      where: or(
        eq(merchantAccounts.id, merchantId),
        eq(merchantAccounts.user_id, merchantId),
      ),
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const actualMerchantId = merchant.id;

    if (orderId) {
      const order = await tx.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.client_id, clientId)),
        with: { items: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException(
          'You can only review items from a delivered order',
        );
      }

      const hasMerchantProduct = (order as any).items?.some(
        (item: any) =>
          item.merchant_id === merchant.id ||
          item.merchant_id === merchant.user_id,
      );
      if (!hasMerchantProduct) {
        throw new ForbiddenException(
          'This order does not contain products from this merchant',
        );
      }

      const existingReview = await tx.query.reviews.findFirst({
        where: and(
          eq(reviews.order_id, orderId),
          eq(reviews.merchant_id, actualMerchantId),
        ),
      });
      if (existingReview) {
        throw new BadRequestException(
          'You have already reviewed this merchant for this order',
        );
      }
    }

    const [savedReview] = await tx
      .insert(reviews)
      .values({
        client_id: clientId,
        merchant_id: actualMerchantId,
        order_id: orderId ?? null,
        rating,
        comment,
        tags: tags ? tags.join(',') : null,
        review_type: 'merchant',
        status: 'approved',
      })
      .returning();

    await this.updateMerchantRating(tx, actualMerchantId);
    return toReviewDomain(savedReview);
  }

  private async updateExpertRating(tx: DrizzleTx, expertId: number) {
    const [result] = await tx
      .select({
        avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`,
        count: count(),
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.expert_id, expertId),
          eq(reviews.status, 'approved'),
        ),
      );

    const average = result ? parseFloat(Number(result.avg).toFixed(1)) : 0;
    const reviewCount = Number(result?.count ?? 0);

    await tx
      .update(expertAccounts)
      .set({ rating: average, total_reviews: reviewCount })
      .where(eq(expertAccounts.id, expertId));
  }

  private async updateMerchantRating(tx: DrizzleTx, merchantId: number) {
    const [result] = await tx
      .select({
        avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`,
        count: count(),
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.merchant_id, merchantId),
          eq(reviews.status, 'approved'),
        ),
      );

    const average = result ? parseFloat(Number(result.avg).toFixed(1)) : 0;
    const reviewCount = Number(result?.count ?? 0);

    await tx
      .update(merchantAccounts)
      .set({ rating: String(average), review_count: reviewCount })
      .where(eq(merchantAccounts.id, merchantId));
  }
}

