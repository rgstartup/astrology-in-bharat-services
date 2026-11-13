/**
 * Normalized payout provider errors.
 *
 * Provider-specific errors (RazorpayX, Cashfree, …) are mapped to these
 * normalized codes so use-cases and controllers don't need provider-specific
 * error handling.
 */
export type PayoutProviderErrorCode =
  | 'provider_error'
  | 'invalid_credentials'
  | 'insufficient_funds'
  | 'account_not_found'
  | 'duplicate_payout'
  | 'rate_limited'
  | 'webhook_invalid'
  | 'unknown';

export class PayoutProviderError extends Error {
  readonly code: PayoutProviderErrorCode;
  readonly providerCode: string;
  readonly statusCode?: number;
  readonly providerErrorCode?: string;

  constructor(
    message: string,
    {
      code = 'unknown',
      providerCode,
      statusCode,
      providerErrorCode,
    }: {
      code?: PayoutProviderErrorCode;
      providerCode: string;
      statusCode?: number;
      providerErrorCode?: string;
    },
  ) {
    super(message);
    this.name = 'PayoutProviderError';
    this.code = code;
    this.providerCode = providerCode;
    this.statusCode = statusCode;
    this.providerErrorCode = providerErrorCode;
  }
}

/**
 * Map a RazorpayX API error to a normalized PayoutProviderError.
 */
export function mapRazorpayError(
  err: unknown,
  providerCode = 'razorpayx',
): PayoutProviderError {
  const message =
    err instanceof Error ? err.message : String(err ?? 'Unknown error');
  const statusCode =
    err instanceof Error && 'status' in err
      ? (err as { status?: number }).status
      : undefined;
  const providerErrorCode =
    err instanceof Error && 'code' in err
      ? (err as { code?: string }).code
      : undefined;

  let code: PayoutProviderErrorCode = 'unknown';
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid') ||
    lower.includes('unauthorized') ||
    lower.includes('authentication') ||
    statusCode === 401 ||
    statusCode === 403
  ) {
    code = 'invalid_credentials';
  } else if (
    lower.includes('insufficient') ||
    lower.includes('low balance') ||
    statusCode === 402
  ) {
    code = 'insufficient_funds';
  } else if (
    lower.includes('not found') ||
    lower.includes('does not exist') ||
    statusCode === 404
  ) {
    code = 'account_not_found';
  } else if (
    lower.includes('duplicate') ||
    lower.includes('already exists') ||
    statusCode === 409
  ) {
    code = 'duplicate_payout';
  } else if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    statusCode === 429
  ) {
    code = 'rate_limited';
  } else if (
    lower.includes('signature') ||
    lower.includes('webhook') ||
    lower.includes('verification failed')
  ) {
    code = 'webhook_invalid';
  }

  return new PayoutProviderError(message, {
    code,
    providerCode,
    statusCode,
    providerErrorCode,
  });
}
