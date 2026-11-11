import { Inject, Injectable } from "@nestjs/common";
import { and, between, count, desc, eq } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { expertAccounts, reviews } from "@/core/drizzledb/schema";
import { GetExpertReviewsDto } from "../dto/get-expert-reviews.dto";
import { toReviewDomain } from "../reviews.mapper";

@Injectable()
export class GetExpertReviewsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expert_id: number, dto: GetExpertReviewsDto) {
    const expert = await this.db.query.expertAccounts.findFirst({
      where: eq(expertAccounts.id, expert_id),
    });

    if (!expert) {
      return {
        data: [],
        total: 0,
        page: dto.page,
        limit: dto.limit,
      };
    }

    const whereClause = and(
      eq(reviews.expert_id, expert.id),
      eq(reviews.status, "approved"),
      ...(dto.startDate && dto.endDate
        ? [between(reviews.created_at, new Date(dto.startDate), new Date(dto.endDate))]
        : []),
    );

    const [rows, [totalResult]] = await Promise.all([
      this.db.query.reviews.findMany({
        where: whereClause,
        with: {
          client: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
              name: true,
              email: true,
            },
          },
        },
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
