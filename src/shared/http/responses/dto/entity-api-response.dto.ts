import { Exclude } from 'class-transformer';
import { ResponseMeta } from '../types/response-meta.type';

/**
 * Standardized success envelope for single entities, primitive values,
 * booleans, or non-paginated collections.
 *
 * @template T - Type of the entity or collection payload.
 */
export class EntityApiResponse<T = unknown> {
  /** Outcome indicator. Always true for success responses. */
  readonly success = true;

  /** Internal semantic classification (excluded from wire JSON). */
  @Exclude()
  readonly type: 'entity' | 'collection' | 'boolean';

  /** The actual response payload. */
  readonly data: T;

  /** Always null on success responses. */
  readonly error: null = null;

  /** Contextual response metadata. */
  readonly meta: ResponseMeta;

  /**
   * Constructs an EntityApiResponse instance.
   *
   * @param {T} data - Returned payload.
   * @param {'entity' | 'collection' | 'boolean'} type - Internal classification.
   * @param {ResponseMeta} meta - Contextual metadata.
   */
  constructor(
    data: T,
    type: 'entity' | 'collection' | 'boolean',
    meta: ResponseMeta,
  ) {
    this.data = data;
    this.type = type;
    this.meta = meta;
  }
}
