import { Inject, Injectable } from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { notifications } from '@/core/drizzledb/schema';
import { GetExpertNotificationsDto } from '../dto/get-expert-notifications.dto';

/**
 * Retrieves a paginated, sortable list of notifications for a given expert.
 *
 * @param expertId - The expert's ID (from `@CurrentExpert()`)
 * @param dto - Pagination and sort options
 * @returns `{ data, totalCount }` — matching notifications and total count
 * @throws {Error} When the database query fails
 */
@Injectable()
export class GetExpertNotificationsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    expertId: number,
    dto: GetExpertNotificationsDto,
  ) {
    const { limit, offset } = dto;
    const data = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.expert_id, Number(expertId)))
      .orderBy(desc(notifications.created_at))
      .limit(limit)
      .offset(offset);

    const [{ totalCount }] = await this.db
      .select({ totalCount: count() })
      .from(notifications)
      .where(eq(notifications.expert_id, Number(expertId)));

    return { data, totalCount };
  }
}
