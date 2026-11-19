/**
 * Detailed field-level error representation.
 */
export interface ApiErrorDetail {
  /** Property path causing validation or business rule rejection. */
  field?: string;
  /** Machine-readable error sub-code. */
  code: string;
  /** Human-readable explanation of rejection. */
  message: string;
}

/**
 * Standardized error payload inside ApiResponse envelope.
 */
export interface ApiError {
  /** Stable machine-readable error code. */
  code: string;
  /** User-friendly error message. */
  message: string;
  /** Optional granular field error breakdowns. */
  details?: ApiErrorDetail[];
  /** Stack trace included only in development mode. Strictly omitted in production. */
  stack?: string;
}
