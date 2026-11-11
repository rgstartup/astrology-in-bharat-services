import { Inject, Injectable } from '@nestjs/common';
import { and, between, count, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { reviews } from '@/core/drizzledb/schema';
import { GetClientReviewsByDateDto } from '../dto/get-client-reviews-by-date.dto';
import { toReviewDomain } from '../reviews.mapper';

@Injectable()
export class GetClientReviewsByDateUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, dto: GetClientReviewsByDateDto) {
    const { page = 1, limit = 20, startDate, endDate } = dto;

    const whereClause = and(
      eq(reviews.client_id, clientId),
      between(reviews.created_at, new Date(startDate!), new Date(endDate!)),
    );

    const [rows, [totalResult]] = await Promise.all([
      this.db.query.reviews.findMany({
        where: whereClause,
        orderBy: [desc(reviews.created_at)],
        limit,
        offset: dto.offset,
      }),
      this.db.select({ total: count() }).from(reviews).where(whereClause),
    ]);

    return {
      data: rows.map(toReviewDomain),
      total: totalResult?.total ?? 0,
      page: dto.page,
      limit: dto.limit,
    };
  }
}