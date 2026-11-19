import { asc, desc, type SQL } from "drizzle-orm";
import { SortDirection, SortOption } from "./sort.types";

/**
 * Maps parsed sort options to Drizzle orderBy expressions using a field-to-column map.
 *
 * Shared helper so each resource does not hand-write its own column mapping.
 *
 * @param sortSpecs - Parsed sort options from `parseSort()`
 * @param columnMap - Map of sort field names to Drizzle column references
 * @param defaultColumn - Fallback column when no sort specs provided
 * @param defaultDirection - Fallback direction (default "desc")
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
 * } as const;
 *
 * const sortSpecs = parseSort<NotificationSortField>(dto.sort);
 * const orderBy = drizzleSortMapper(sortSpecs, columnMap, notifications.created_at, "desc");
 *
 * return this.db.select().from(notifications).orderBy(...orderBy);
 * ```
 */
export function drizzleSortMapper(
  sortSpecs: SortOption<string>[],
  columnMap: Record<string, any>,
  defaultColumn?: any,
  defaultDirection: SortDirection = "desc",
): SQL[] {
  if (sortSpecs.length === 0) {
    if (!defaultColumn) return [];
    return [
      defaultDirection === "desc"
        ? desc(defaultColumn)
        : asc(defaultColumn),
    ];
  }

  return sortSpecs
    .map(({ field, direction }) => {
      const column = columnMap[field];
      if (!column) return null;
      return direction === "desc" ? desc(column) : asc(column);
    })
    .filter((expr): expr is SQL => expr !== null);
}
