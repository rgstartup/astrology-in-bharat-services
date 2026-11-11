import { Inject, Injectable } from "@nestjs/common";
import { and, between, count, desc, eq } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { reviews } from "@/core/drizzledb/schema";
import { toReviewDomain } from "../reviews.mapper";
import { GetExpertReviewsByDateDto } from "../dto/get-expert-reviews-by-date.dto";

@Injectable()
export class GetExpertReviewsByDateUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expert_id: number, dto: GetExpertReviewsByDateDto) {
    const { startDate, endDate } = dto;

    const whereClause = and(
      eq(reviews.expert_id, expert_id),
      between(reviews.created_at, new Date(startDate!), new Date(endDate!)),
    );

    const [rows, [totalResult]] = await Promise.all([
      this.db.query.reviews.findMany({
        where: whereClause,
        orderBy: [desc(reviews.created_at)],
        limit: dto.limit,
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
