import { Inject, Injectable } from '@nestjs/common';
import { and, between, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { reviews } from '@/core/drizzledb/schema';
import { toReviewDomain } from '../reviews.mapper';

@Injectable()
export class GetExpertReviewsByDateUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expert_id: number, startDate: Date, endDate: Date) {
    const rows = await this.db.query.reviews.findMany({
      where: and(
        eq(reviews.expert_id, expert_id),
        between(reviews.created_at, startDate, endDate),
      ),
    });
    return rows.map(toReviewDomain);
  }
}

