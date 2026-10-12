import { Inject, Injectable } from '@nestjs/common';
import { count, gte, lte, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { reviews } from '@/core/drizzledb/schema';

@Injectable()
export class GetAdminReviewsStatsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute() {
    const [
      [{ total }],
      [{ good: goodCount }],
      [{ moderate: moderateCount }],
      [{ bad: badCount }],
    ] = await Promise.all([
      this.db.select({ total: count() }).from(reviews),
      this.db
        .select({ good: count() })
        .from(reviews)
        .where(gte(reviews.rating, 4)),
      this.db
        .select({ moderate: count() })
        .from(reviews)
        .where(eq(reviews.rating, 3)),
      this.db
        .select({ bad: count() })
        .from(reviews)
        .where(lte(reviews.rating, 2)),
    ]);

    return {
      total,
      good: goodCount,
      moderate: moderateCount,
      bad: badCount,
    };
  }
}

