import { DomainError } from '@/shared/types/domain.error';

/**
 * Thrown when the expert is not online and cannot accept a
 * consultation request.
 * Mode-agnostic: used for both chat and voice initiation.
 */
export class ExpertUnavailableError extends DomainError {
  readonly code = 'EXPERT_UNAVAILABLE';
  readonly message =
    'Expert is currently offline and not accepting consultations at the moment.';
}
