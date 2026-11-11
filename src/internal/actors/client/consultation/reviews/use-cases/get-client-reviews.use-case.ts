import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { reviews } from '@/core/drizzledb/schema';
import { GetClientReviewsDto } from '../dto/get-client-reviews.dto';
import { toReviewDomain } from '../reviews.mapper';

@Injectable()
export class GetClientReviewsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, dto: GetClientReviewsDto) {
    const { page = 1, limit = 20 } = dto;

    const whereClause = eq(reviews.client_id, clientId);

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