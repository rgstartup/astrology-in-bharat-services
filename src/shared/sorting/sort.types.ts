export type SortDirection = "asc" | "desc";

export interface SortOption<T extends string = string> {
  field: T;
  direction: SortDirection;
}
