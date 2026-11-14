import { PaginationMetaDto } from './paginated-response.dto';

/** Error payload inside the envelope */
export class ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  path?: string;
  timestamp: string;

  constructor(partial: Partial<ApiError>) {
    Object.assign(this, partial);
  }
}

/** Metadata inside the envelope */
export class ResponseMeta {
  timestamp: string;
  pagination?: PaginationMetaDto;
  message?: string;

  constructor(partial: Partial<ResponseMeta>) {
    Object.assign(this, partial);
  }
}

/**
 * Unified response envelope for ALL endpoints.
 * - success responses: { success: true, data: T, error: null, meta }
 * - error responses:   { success: false, data: null, error: ApiError, meta }
 * - paginated:         data = T[], meta.pagination = PaginationMetaDto
 * - BooleanMessage:    data = null, meta.message = message
 * - void/empty:        data = null
 */
export class ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: ResponseMeta;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, partial);
  }

  /** Successful response with optional pagination and message */
  static ok<T>(data: T, pagination?: PaginationMetaDto, message?: string): ApiResponse<T> {
    return new ApiResponse<T>({
      success: true,
      data,
      error: null,
      meta: new ResponseMeta({
        timestamp: new Date().toISOString(),
        pagination,
        message,
      }),
    });
  }

  /** Error response */
  static fail<T>(error: ApiError, data: T | null = null): ApiResponse<T> {
    return new ApiResponse<T>({
      success: false,
      data,
      error,
      meta: new ResponseMeta({
        timestamp: new Date().toISOString(),
      }),
    });
  }

  /** Convenience: empty success (e.g. 204 No Content) */
  static empty(pagination?: PaginationMetaDto): ApiResponse<null> {
    return new ApiResponse<null>({
      success: true,
      data: null,
      error: null,
      meta: new ResponseMeta({
        timestamp: new Date().toISOString(),
        pagination,
      }),
    });
  }
}