import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class PayoutOnboardingNotFoundError extends DomainError {
  readonly code = 'PAYOUT_ONBOARDING_NOT_FOUND';
  readonly message: string;
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(readonly onboardingId: number) {
    super();
    this.message = `Payout onboarding not found: ${onboardingId}`;
  }
}
