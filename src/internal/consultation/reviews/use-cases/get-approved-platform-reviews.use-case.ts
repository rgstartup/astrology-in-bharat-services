import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { reviews } from '@/core/drizzledb/schema';
import { toReviewDomain } from '../reviews.mapper';

@Injectable()
export class GetApprovedPlatformReviewsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(limit: number = 6) {
    const rows = await this.db.query.reviews.findMany({
      where: and(
        eq(reviews.review_type, 'platform'),
        eq(reviews.status, 'approved'),
      ),
      with: { client: { with: { user: true } } },
      orderBy: [desc(reviews.created_at)],
      limit,
    });

    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:6543/';

    const mappedReviews = rows.map((r) => {
      const domain = toReviewDomain(r);
      const rawAvatar = domain.client?.avatar || domain.client?.user?.avatar || null;
      const fullAvatar =
        typeof rawAvatar === 'string'
          ? rawAvatar.startsWith('http')
            ? rawAvatar
            : `${baseUrl.replace(/\/$/, '')}/${rawAvatar.replace(/^\//, '')}`
          : null;

      return {
        id: domain.id,
        rating: domain.rating,
        comment: domain.comment,
        tags: domain.tags,
        created_at: domain.created_at,
        user: {
          name: domain.client?.name || domain.client?.user?.name || 'Anonymous',
          avatar: fullAvatar,
        },
      };
    });

    return mappedReviews;
  }
}

