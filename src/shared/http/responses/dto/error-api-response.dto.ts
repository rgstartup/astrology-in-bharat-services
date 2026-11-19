import { Exclude } from 'class-transformer';
import { ResponseMeta } from '../types/response-meta.type';
import { ApiError } from '../types/api-error.type';

/**
 * Standardized error envelope for all failed API responses.
 */
export class ErrorApiResponse {
  /** Outcome indicator. Always false on failures. */
  readonly success = false;

  /** Internal semantic classification (excluded from wire JSON). */
  @Exclude()
  readonly type = 'error' as const;

  /** Always null on error responses. */
  readonly data: null = null;

  /** Normalized error details. */
  readonly error: ApiError;

  /** Contextual response metadata including request path and ID. */
  readonly meta: ResponseMeta;

  /**
   * Constructs an ErrorApiResponse instance.
   *
   * @param {ApiError} error - Normalized error details.
   * @param {ResponseMeta} meta - Contextual metadata.
   */
  constructor(error: ApiError, meta: ResponseMeta) {
    this.error = error;
    this.meta = meta;
  }
}
