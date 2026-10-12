import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, ilike, lte } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { reviews } from '@/core/drizzledb/schema';
import { GetAdminReviewsDto } from '../dto/get-admin-reviews.dto';
import { toReviewDomain } from '../reviews.mapper';

@Injectable()
export class GetAdminReviewsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(dto: GetAdminReviewsDto) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      ratingType,
      review_type,
    } = dto;

    const conditions = [];

    if (status && status !== 'all') {
      conditions.push(eq(reviews.status, status));
    }

    if (ratingType && ratingType !== 'all') {
      if (ratingType === 'good') conditions.push(gte(reviews.rating, 4));
      else if (ratingType === 'moderate')
        conditions.push(eq(reviews.rating, 3));
      else if (ratingType === 'bad') conditions.push(lte(reviews.rating, 2));
    }

    if (review_type && review_type !== 'all') {
      conditions.push(eq(reviews.review_type, review_type));
    }

    if (search) {
      conditions.push(ilike(reviews.comment, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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

    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:6543/';

    const mappedReviews = rows.map((r) => {
      const domain = toReviewDomain(r);
      const rawAvatar = domain.client?.avatar;
      const fullAvatar =
        typeof rawAvatar === 'string'
          ? rawAvatar.startsWith('http')
            ? rawAvatar
            : `${baseUrl.replace(/\/$/, '')}/${rawAvatar.replace(/^\//, '')}`
          : null;

      return {
        ...domain,
        client: domain.client
          ? {
              ...domain.client,
              avatar: fullAvatar,
            }
          : null,
      };
    });

    return {
      reviews: mappedReviews,
      total: totalResult?.total ?? 0,
      page,
      limit,
    };
  }
}

