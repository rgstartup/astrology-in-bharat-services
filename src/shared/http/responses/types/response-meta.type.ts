import { PaginationMeta } from './pagination-meta.type';

/**
 * Metadata carried inside every ApiResponse envelope.
 */
export interface ResponseMeta {
  /** ISO 8601 UTC timestamp of response creation. */
  timestamp: string;
  /** Correlation identifier linked to the request. */
  requestId: string;
  /** Request URL path (primarily present on errors). */
  path?: string;
  /** Optional human-readable message. */
  message?: string;
  /** Optional pagination metadata for collection responses. */
  pagination?: PaginationMeta;
}
