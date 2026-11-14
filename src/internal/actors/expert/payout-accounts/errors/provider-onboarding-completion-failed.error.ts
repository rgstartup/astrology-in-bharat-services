import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class ProviderOnboardingCompletionFailedError extends DomainError {
  readonly code = 'PROVIDER_ONBOARDING_COMPLETION_FAILED';
  readonly message: string;
  readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(readonly providerCode: string, readonly reason: string) {
    super();
    this.message = `Provider onboarding completion failed for ${providerCode}: ${reason}`;
  }
}
