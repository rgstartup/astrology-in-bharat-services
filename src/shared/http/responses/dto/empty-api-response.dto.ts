import { Exclude } from 'class-transformer';
import { ResponseMeta } from '../types/response-meta.type';

/**
 * Standardized success envelope for void / empty operations.
 */
export class EmptyApiResponse {
  /** Outcome indicator. Always true for success responses. */
  readonly success = true;

  /** Internal semantic classification (excluded from wire JSON). */
  @Exclude()
  readonly type = 'empty' as const;

  /** Always null for empty operations. */
  readonly data: null = null;

  /** Always null on success responses. */
  readonly error: null = null;

  /** Contextual response metadata. */
  readonly meta: ResponseMeta;

  /**
   * Constructs an EmptyApiResponse instance.
   *
   * @param {ResponseMeta} meta - Contextual metadata.
   */
  constructor(meta: ResponseMeta) {
    this.meta = meta;
  }
}
