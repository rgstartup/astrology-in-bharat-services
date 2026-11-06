import type { SortOption } from "./sort.types";

export function parseSort<T extends string>(sort?: string): SortOption<T>[] {
  if (!sort) return [];

  return sort.split(",").map((item) => {
    const [field, direction] = item.split("-");

    return {
      field: field as T,
      direction: direction as "asc" | "desc",
    };
  });
}
