import { DomainError } from '@/shared/types/domain.error';

export class PayoutOnboardingAlreadyCompletedError extends DomainError {
  readonly code = 'PAYOUT_ONBOARDING_ALREADY_COMPLETED';
  readonly message = 'Onboarding already completed';
}
