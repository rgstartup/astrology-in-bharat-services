import { Inject, Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { reviews } from '@/core/drizzledb/schema';

@Injectable()
export class GetMerchantReviewsStatsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(merchantId: number) {
    const [statsResult] = await this.db
      .select({
        avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`,
        count: count(),
      })
      .from(reviews)
      .where(eq(reviews.merchant_id, merchantId));

    const distResult = await this.db
      .select({
        rating: sql<number>`cast(round(${reviews.rating}) as integer)`,
        count: count(),
      })
      .from(reviews)
      .where(eq(reviews.merchant_id, merchantId))
      .groupBy(sql`round(${reviews.rating})`);

    const distribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    distResult.forEach((d) => {
      const rating = d.rating?.toString();
      if (rating && Object.prototype.hasOwnProperty.call(distribution, rating)) {
        distribution[rating] = Number(d.count);
      }
    });

    return {
      average_rating: parseFloat(Number(statsResult?.avg ?? 0).toFixed(1)),
      totalReviews: Number(statsResult?.count ?? 0),
      distribution,
    };
  }
}

