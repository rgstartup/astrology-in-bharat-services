import { asc, desc, type SQL, type AnyColumn } from "drizzle-orm";
import type { SortOption } from "./sort.types";

/**
 * Maps parsed sort options to Drizzle orderBy expressions.
 *
 * @param sortSpecs - Parsed sort options from `parseSort()`
 * @param columnMap - Map of allowed sort fields to Drizzle columns
 * @returns Array of Drizzle ordering expressions for `.orderBy(...)`
 *
 * @example
 * ```ts
 * const columnMap = {
 *   id: notifications.id,
 *   created_at: notifications.created_at,
 *   is_read: notifications.is_read,
 *   title: notifications.title,
 *   type: notifications.type,
 * } satisfies Record<NotificationSortField, AnyColumn>;
 *
 * const sortSpecs = parseSort<NotificationSortField>(dto.sort);
 * const orderBy = drizzleSortMapper(sortSpecs, columnMap);
 *
 * return this.db.select().from(notifications).orderBy(...orderBy);
 * ```
 */
export function drizzleSortMapper<T extends string>(
  sortSpecs: readonly SortOption<T>[],
  columnMap: Readonly<Record<T, AnyColumn>>,
): SQL[] {
  return sortSpecs.map(({ field, direction }) => {
    const column = columnMap[field];

    return direction === "desc" ? desc(column) : asc(column);
  });
}
