import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class PayoutProviderAccountNotConfiguredError extends DomainError {
  readonly code = 'PAYOUT_PROVIDER_ACCOUNT_NOT_CONFIGURED';
  readonly message: string;
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(readonly providerCode: string) {
    super();
    this.message = `No payout provider account configured for provider: ${providerCode}`;
  }
}
