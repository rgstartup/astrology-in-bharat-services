import { Inject, Injectable } from "@nestjs/common";
import { count, eq } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { parseSort } from "@/shared/sorting/sort.parser";
import { drizzleSortMapper } from "@/shared/sorting/sort.mapper";
import { notifications } from "@/core/drizzledb/schema";
import { GetExpertNotificationsDto } from "../dto/get-expert-notifications.dto";

const notificationSortColumns = {
  id: notifications.id,
  created_at: notifications.created_at,
  is_read: notifications.is_read,
  title: notifications.title,
  type: notifications.type,
} as const;

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

  async execute(expertId: number, dto: GetExpertNotificationsDto) {
    const sortSpecs = parseSort(dto.sort);

    const orderBy = drizzleSortMapper(
      sortSpecs,
      notificationSortColumns,
      notifications.created_at,
      "desc",
    );

    const data = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.expert_id, Number(expertId)))
      .orderBy(...orderBy)
      .limit(dto.limit)
      .offset(dto.offset);

    const [{ totalCount }] = await this.db
      .select({ totalCount: count() })
      .from(notifications)
      .where(eq(notifications.expert_id, Number(expertId)));

    return { data, totalCount };
  }
}
