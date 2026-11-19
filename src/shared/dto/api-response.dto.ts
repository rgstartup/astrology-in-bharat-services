/**
 * Legacy compatibility bridge.
 * Canonical implementation now lives in `@/shared/http/responses`.
 */
export {
  ApiResponse,
  EntityApiResponse,
  PaginatedApiResponse,
  EmptyApiResponse,
  ErrorApiResponse,
  type ResponseMeta,
  type PaginationMeta,
  type ApiError,
  type ApiErrorDetail,
  type ApiResponseOptions,
  type ApiErrorOptions,
  type ApiResponseUnion,
  type ApiResponseType,
} from '@/shared/http/responses';
