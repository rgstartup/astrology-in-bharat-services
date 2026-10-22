import { DomainError } from '@/shared/types/domain.error';

/**
 * Thrown when the client wallet balance is insufficient to hold the
 * minimum required amount for starting a consultation.
 * Mode-agnostic: used for both chat and voice initiation.
 */
export class InsufficientBalanceError extends DomainError {
  readonly code = 'INSUFFICIENT_BALANCE';
  readonly message =
    'Insufficient funds, please top up your wallet to continue.';
}
