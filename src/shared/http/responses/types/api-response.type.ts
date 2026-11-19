import type { EntityApiResponse } from '../dto/entity-api-response.dto';
import type { PaginatedApiResponse } from '../dto/paginated-api-response.dto';
import type { EmptyApiResponse } from '../dto/empty-api-response.dto';
import type { ErrorApiResponse } from '../dto/error-api-response.dto';

/**
 * Eligible semantic response payload classifications.
 */
export type ApiResponseType =
  | 'entity'
  | 'collection'
  | 'paginated'
  | 'boolean'
  | 'empty'
  | 'error';

/**
 * Discriminated union of all standardized API response envelopes.
 *
 * @template T - Type of the response payload.
 */
export type ApiResponse<T = unknown> =
  | EntityApiResponse<T>
  | PaginatedApiResponse<T>
  | EmptyApiResponse
  | ErrorApiResponse;
