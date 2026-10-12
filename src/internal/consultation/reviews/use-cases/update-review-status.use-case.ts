import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb, DrizzleTx } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, merchantAccounts, reviews } from '@/core/drizzledb/schema';
import { BooleanMessage } from '../../../../shared/dto/boolean-message.dto';

@Injectable()
export class UpdateReviewStatusUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number, status: string): Promise<BooleanMessage> {
    return this.db.transaction(async (tx) => {
      const review = await tx.query.reviews.findFirst({
        where: eq(reviews.id, id),
      });
      if (!review) {
        throw new NotFoundException(`Review with id ${id} not found`);
      }

      const [updated] = await tx
        .update(reviews)
        .set({ status })
        .where(eq(reviews.id, id))
        .returning();

      if (!updated) {
        throw new NotFoundException(`Review with id ${id} not found`);
      }

      if (review.expert_id) {
        await this.updateExpertRating(tx, review.expert_id);
      }
      if (review.merchant_id) {
        await this.updateMerchantRating(tx, review.merchant_id);
      }

      return new BooleanMessage(true, 'Review Updated Successfully');
    });
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
