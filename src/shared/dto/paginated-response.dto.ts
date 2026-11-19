import { PaginationMeta } from './api-response.dto';

/**
 * Standardized pagination metadata DTO.
 * Implements PaginationMeta with dual-compatibility for legacy consumer keys.
 */
export class PaginationMetaDto implements PaginationMeta {
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

  /**
   * Backward-compatible alias for totalItems.
   */
  get total(): number {
    return this.totalItems;
  }
  set total(value: number) {
    this.totalItems = Number(value);
  }

  /**
   * Backward-compatible alias for hasPreviousPage.
   */
  get hasPrevPage(): boolean {
    return this.hasPreviousPage;
  }
  set hasPrevPage(value: boolean) {
    this.hasPreviousPage = Boolean(value);
  }

  /**
   * Constructs PaginationMetaDto.
   *
   * @param {number} total - Total item count.
   * @param {number} [page=1] - Current page number.
   * @param {number} [limit=10] - Items per page.
   */
  constructor(total: number, page: number = 1, limit: number = 10) {
    const validLimit = Math.max(1, limit || 10);
    const validPage = Math.max(1, page || 1);
    const totalItems = Math.max(0, Number(total) || 0);
    const totalPages = Math.ceil(totalItems / validLimit) || 1;

    this.totalItems = totalItems;
    this.page = validPage;
    this.limit = validLimit;
    this.totalPages = totalPages;
    this.hasNextPage = validPage < totalPages;
    this.hasPreviousPage = validPage > 1;
  }
}

/**
 * @deprecated Legacy internal container. Use ApiResponse directly for API responses.
 */
export class PaginatedResponseDto<T> {
  success: boolean;
  data: T[];
  meta: PaginationMetaDto;
  message?: string;

  constructor(
    data: T[],
    total: number,
    page: number = 1,
    limit: number = 10,
    message?: string,
  ) {
    this.success = true;
    this.data = data;
    this.meta = new PaginationMetaDto(total, page, limit);
    if (message) {
      this.message = message;
    }
  }

  /**
   * Helper factory to create a PaginatedResponseDto using pagination options.
   *
   * @template T
   * @param {T[]} data - Array of data items.
   * @param {number} total - Total count.
   * @param {{ page?: number; limit?: number }} pagination - Page and limit options.
   * @param {string} [message] - Optional message.
   * @returns {PaginatedResponseDto<T>}
   */
  static from<T>(
    data: T[],
    total: number,
    pagination: { page?: number; limit?: number },
    message?: string,
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto<T>(
      data,
      total,
      pagination.page ?? 1,
      pagination.limit ?? 10,
      message,
    );
  }

  /**
   * Helper factory to create a PaginatedResponseDto with individual arguments.
   *
   * @template T
   * @param {T[]} data - Array of data items.
   * @param {number} total - Total count.
   * @param {number} [page=1] - Current page.
   * @param {number} [limit=10] - Limit per page.
   * @param {string} [message] - Optional message.
   * @returns {PaginatedResponseDto<T>}
   */
  static create<T>(
    data: T[],
    total: number,
    page: number = 1,
    limit: number = 10,
    message?: string,
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto<T>(data, total, page, limit, message);
  }
}
