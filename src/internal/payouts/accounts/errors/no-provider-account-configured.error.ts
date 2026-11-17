import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class NoProviderAccountConfiguredError extends DomainError {
  readonly code = 'NO_PROVIDER_ACCOUNT_CONFIGURED';
  readonly message: string;
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(readonly payoutAccountId: number) {
    super();
    this.message = `No provider account configured for payout account ${payoutAccountId}`;
  }
}
