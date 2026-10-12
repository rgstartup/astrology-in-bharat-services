import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, or } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, reviews } from '@/core/drizzledb/schema';
import { GetReviewsDto } from '../dto/get-reviews.dto';
import { toReviewDomain } from '../reviews.mapper';

@Injectable()
export class GetExpertReviewsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expert_id: number, dto: GetReviewsDto) {
    const { page = 1, limit = 20 } = dto;
    const expert = await this.db.query.expertAccounts.findFirst({
      where: or(
        eq(expertAccounts.id, expert_id),
        eq(expertAccounts.user_id, expert_id),
      ),
    });

    if (!expert) {
      return {
        data: [],
        total: 0,
        page,
        limit,
      };
    }

    const whereClause = and(
      eq(reviews.expert_id, expert.id),
      eq(reviews.status, 'approved'),
    );

    const [rows, [totalResult]] = await Promise.all([
      this.db.query.reviews.findMany({
        where: whereClause,
        with: { client: { with: { user: true } } },
        orderBy: [desc(reviews.created_at)],
        limit,
        offset: (page - 1) * limit,
      }),
      this.db.select({ total: count() }).from(reviews).where(whereClause),
    ]);

    return {
      data: rows.map(toReviewDomain),
      total: totalResult?.total ?? 0,
      page,
      limit,
    };
  }
}
