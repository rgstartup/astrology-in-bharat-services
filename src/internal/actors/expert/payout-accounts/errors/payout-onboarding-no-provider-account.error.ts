import { DomainError } from '@/shared/types/domain.error';

export class PayoutOnboardingNoProviderAccountError extends DomainError {
  readonly code = 'PAYOUT_ONBOARDING_NO_PROVIDER_ACCOUNT';
  readonly message = 'Onboarding has no provider account configured';
}
