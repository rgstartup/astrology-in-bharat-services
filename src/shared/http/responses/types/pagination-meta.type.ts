/**
 * Standardized pagination metadata contract.
 */
export interface PaginationMeta {
  /** Current 1-based page number. */
  page: number;
  /** Maximum items per page requested. */
  limit: number;
  /** Total count of items matching filter criteria. */
  totalItems: number;
  /** Total available pages. */
  totalPages: number;
  /** Whether a succeeding page exists. */
  hasNextPage: boolean;
  /** Whether a preceding page exists. */
  hasPreviousPage: boolean;

  /** Backward-compatible alias for totalItems. */
  total?: number;
  /** Backward-compatible alias for hasPreviousPage. */
  hasPrevPage?: boolean;
}
