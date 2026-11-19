import { EntityApiResponse } from '../dto/entity-api-response.dto';
import { PaginatedApiResponse } from '../dto/paginated-api-response.dto';
import { EmptyApiResponse } from '../dto/empty-api-response.dto';
import { ErrorApiResponse } from '../dto/error-api-response.dto';
import { PaginationMeta } from '../types/pagination-meta.type';
import { ApiError } from '../types/api-error.type';
import { ResponseMeta } from '../types/response-meta.type';

/**
 * Options for customizing success envelopes.
 */
export interface ApiResponseOptions {
  /** Request correlation ID. */
  requestId?: string;
  /** Optional human-readable message. */
  message?: string;
}

/**
 * Options for customizing error envelopes.
 */
export interface ApiErrorOptions {
  /** Request correlation ID. */
  requestId: string;
  /** Request URL path. */
  path?: string;
}

/**
 * Canonical factory namespace for creating standardized API response envelopes.
 */
export class ApiResponse {
  /**
   * Creates a successful entity, boolean, or collection response envelope.
   * Automatically sets type to 'boolean' if data is boolean, or 'collection' if array.
   *
   * @template T
   * @param {T} data - Payload data.
   * @param {ApiResponseOptions} [options] - Optional correlation ID and message.
   * @returns {EntityApiResponse<T>}
   */
  static ok<T>(data: T, options?: ApiResponseOptions): EntityApiResponse<T> {
    const type: 'entity' | 'collection' | 'boolean' =
      typeof data === 'boolean'
        ? 'boolean'
        : Array.isArray(data)
          ? 'collection'
          : 'entity';

    const meta: ResponseMeta = {
      timestamp: new Date().toISOString(),
      requestId: options?.requestId ?? '',
      message: options?.message,
    };

    return new EntityApiResponse<T>(data, type, meta);
  }

  /**
   * Creates a paginated collection response envelope.
   *
   * @template T
   * @param {T[]} items - Array of items for current page.
   * @param {PaginationMeta} pagination - Pagination metadata.
   * @param {ApiResponseOptions} [options] - Optional correlation ID and message.
   * @returns {PaginatedApiResponse<T>}
   */
  static paginated<T>(
    items: T[],
    pagination: PaginationMeta,
    options?: ApiResponseOptions,
  ): PaginatedApiResponse<T> {
    const totalItems =
      pagination.totalItems !== undefined
        ? pagination.totalItems
        : pagination.total !== undefined
          ? pagination.total
          : 0;

    const hasPreviousPage =
      pagination.hasPreviousPage !== undefined
        ? pagination.hasPreviousPage
        : pagination.hasPrevPage !== undefined
          ? pagination.hasPrevPage
          : false;

    const normalizedPagination: PaginationMeta = {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage,
      total: totalItems,
      hasPrevPage: hasPreviousPage,
    };

    const meta: ResponseMeta & { pagination: PaginationMeta } = {
      timestamp: new Date().toISOString(),
      requestId: options?.requestId ?? '',
      message: options?.message,
      pagination: normalizedPagination,
    };

    return new PaginatedApiResponse<T>(items, meta);
  }

  /**
   * Creates an empty (void) success response envelope.
   *
   * @param {ApiResponseOptions} [options] - Optional correlation ID and message.
   * @returns {EmptyApiResponse}
   */
  static empty(options?: ApiResponseOptions): EmptyApiResponse {
    const meta: ResponseMeta = {
      timestamp: new Date().toISOString(),
      requestId: options?.requestId ?? '',
      message: options?.message,
    };

    return new EmptyApiResponse(meta);
  }

  /**
   * Creates a standardized error response envelope.
   *
   * @param {ApiError} error - Normalized error details.
   * @param {ApiErrorOptions} options - Required correlation ID and optional path.
   * @returns {ErrorApiResponse}
   */
  static fail(error: ApiError, options: ApiErrorOptions): ErrorApiResponse {
    const meta: ResponseMeta = {
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
      path: options.path,
    };

    return new ErrorApiResponse(error, meta);
  }
}
