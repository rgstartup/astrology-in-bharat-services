import { DomainError } from '@/shared/types/domain.error';

/**
 * Thrown when the expert has no active price configured for the
 * requested consultation mode.
 * Mode-agnostic: used for both chat and voice initiation.
 */
export class PriceNotFoundError extends DomainError {
  readonly code = 'PRICE_NOT_FOUND';
  readonly message = 'Consultation price not configured for this expert';
}
