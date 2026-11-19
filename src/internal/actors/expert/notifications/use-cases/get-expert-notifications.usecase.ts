import { Inject, Injectable } from "@nestjs/common";
import { asc, count, desc, eq, type SQL } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { notifications } from "@/core/drizzledb/schema";
import { GetExpertNotificationsDto } from "../dto/get-expert-notifications.dto";

const notificationSortColumns = {
  id: notifications.id,
  created_at: notifications.created_at,
  is_read: notifications.is_read,
  title: notifications.title,
  type: notifications.type,
} as const;

type SortDirection = "asc" | "desc";

interface SortSpec {
  field: keyof typeof notificationSortColumns;
  direction: SortDirection;
}

/**
 * Parses the `sort` query string produced by `SortDto`, e.g.
 * `created_at-desc,id-asc` → `[{ field: "created_at", direction: "desc" }, ...]`.
 * Invalid/unknown fields are skipped; empty input returns `[]`.
 */
function parseSort(sort?: string): SortSpec[] {
  if (!sort) return [];

  return sort
    .split(",")
    .map((part) => part.trim().split("-"))
    .filter(([field, dir]) => {
      const validDir = dir === "asc" || dir === "desc";
      return field in notificationSortColumns && validDir;
    })
    .map(([field, dir]) => ({
      field: field as keyof typeof notificationSortColumns,
      direction: dir as SortDirection,
    }));
}

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

    const orderBy: SQL[] =
      sortSpecs.length > 0
        ? sortSpecs.map(({ field, direction }) => {
            const column = notificationSortColumns[field] ?? notifications.created_at;
            return direction === "desc" ? desc(column) : asc(column);
          })
        : [desc(notifications.created_at)];

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
