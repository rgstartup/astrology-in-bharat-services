import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { reviews } from '@/core/drizzledb/schema';

@Injectable()
export class GetClientReviewsStatsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number) {
    const result = await this.db
      .select({
        rating: sql<number>`cast(round(${reviews.rating}) as integer)`,
        count: count(),
      })
      .from(reviews)
      .where(eq(reviews.client_id, clientId))
      .groupBy(sql`round(${reviews.rating})`);

    const counts = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };

    let totalReviews = 0;
    let sumRatings = 0;

    result.forEach((row) => {
      const ratingKey = row.rating?.toString();
      if (ratingKey && Object.prototype.hasOwnProperty.call(counts, ratingKey)) {
        const rowCount = Number(row.count) || 0;
        counts[ratingKey as keyof typeof counts] = rowCount;
        totalReviews += rowCount;
        sumRatings += parseInt(ratingKey, 10) * rowCount;
      }
    });

    const averageRating = totalReviews > 0 ? sumRatings / totalReviews : 0;

    const typeResult = await this.db
      .select({
        review_type: reviews.review_type,
        count: count(),
      })
      .from(reviews)
      .where(eq(reviews.client_id, clientId))
      .groupBy(reviews.review_type);

    const typeCounts: Record<string, number> = {
      expert: 0,
      merchant: 0,
      platform: 0,
    };

    typeResult.forEach((row) => {
      if (row.review_type && Object.prototype.hasOwnProperty.call(typeCounts, row.review_type)) {
        typeCounts[row.review_type] = Number(row.count) || 0;
      }
    });

    return {
      rating: Number(averageRating.toFixed(1)),
      totalReviews,
      counts,
      typeCounts,
    };
  }
}