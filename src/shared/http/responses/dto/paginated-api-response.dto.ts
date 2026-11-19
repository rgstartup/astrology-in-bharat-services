import { Exclude } from 'class-transformer';
import { ResponseMeta } from '../types/response-meta.type';
import { PaginationMeta } from '../types/pagination-meta.type';

/**
 * Standardized success envelope for paginated collection responses.
 *
 * @template T - Type of elements inside the paginated array.
 */
export class PaginatedApiResponse<T = unknown> {
  /** Outcome indicator. Always true for success responses. */
  readonly success = true;

  /** Internal semantic classification (excluded from wire JSON). */
  @Exclude()
  readonly type = 'paginated' as const;

  /** Array of items on current page. */
  readonly data: T[];

  /** Always null on success responses. */
  readonly error: null = null;

  /** Metadata containing required pagination metrics. */
  readonly meta: ResponseMeta & { pagination: PaginationMeta };

  /**
   * Constructs a PaginatedApiResponse instance.
   *
   * @param {T[]} data - Collection items.
   * @param {ResponseMeta & { pagination: PaginationMeta }} meta - Metadata including pagination.
   */
  constructor(
    data: T[],
    meta: ResponseMeta & { pagination: PaginationMeta },
  ) {
    this.data = data;
    this.meta = meta;
  }
}
