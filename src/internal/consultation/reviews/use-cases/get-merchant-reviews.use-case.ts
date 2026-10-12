import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { reviews } from '@/core/drizzledb/schema';
import { GetReviewsDto } from '../dto/get-reviews.dto';
import { PaginatedResponseDto } from '../../../../shared/dto/paginated-response.dto';
import { toReviewDomain } from '../reviews.mapper';

@Injectable()
export class GetMerchantReviewsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(merchantId: number, dto: GetReviewsDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause = and(
      eq(reviews.merchant_id, merchantId),
      eq(reviews.status, 'approved'),
    );

    const [rows, [totalResult]] = await Promise.all([
      this.db.query.reviews.findMany({
        where: whereClause,
        with: { client: { with: { user: true } } },
        limit,
        offset: skip,
        orderBy: [desc(reviews.created_at)],
      }),
      this.db.select({ total: count() }).from(reviews).where(whereClause),
    ]);

    const mapped = rows.map(toReviewDomain);
    const formattedReviews = mapped.map((r) => ({
      name: r.client?.name || 'Anonymous',
      img: r.client?.avatar,
      rating: r.rating,
      text: r.comment,
      createdAt: r.created_at,
    }));

    return PaginatedResponseDto.from(formattedReviews, totalResult?.total ?? 0, {
      page,
      limit,
    });
  }
}

