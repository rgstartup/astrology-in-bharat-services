import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, reviews } from '@/core/drizzledb/schema';

@Injectable()
export class GetReviewsStatsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expert_id: number) {
    const expert = await this.db.query.expertAccounts.findFirst({
      where: or(
        eq(expertAccounts.id, expert_id),
        eq(expertAccounts.user_id, expert_id),
      ),
    });
    if (!expert) return null;

    // Get star-wise distribution counts
    const result = await this.db
      .select({
        rating: sql<number>`cast(round(${reviews.rating}) as integer)`,
        count: count(),
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.expert_id, expert.id),
          eq(reviews.status, 'approved'),
        ),
      )
      .groupBy(sql`round(${reviews.rating})`);

    // Initialize counts for all stars 1 to 5
    const counts = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };

    let calculatedTotalReviews = 0;
    let sumRatings = 0;

    result.forEach((row) => {
      const ratingKey = row.rating?.toString();
      if (ratingKey && Object.prototype.hasOwnProperty.call(counts, ratingKey)) {
        const rowCount = Number(row.count) || 0;
        counts[ratingKey as keyof typeof counts] = rowCount;
        calculatedTotalReviews += rowCount;
        sumRatings += parseInt(ratingKey, 10) * rowCount;
      }
    });

    const averageRating =
      calculatedTotalReviews > 0 ? sumRatings / calculatedTotalReviews : 0;

    return {
      rating: Number(averageRating.toFixed(1)),
      totalReviews: calculatedTotalReviews,
      counts,
    };
  }
}
