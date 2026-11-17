import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class PayoutAccountIsPrimaryError extends DomainError {
  readonly code = 'PAYOUT_ACCOUNT_IS_PRIMARY';
  readonly message: string;
  readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(readonly payoutAccountId: number) {
    super();
    this.message = `Payout account ${payoutAccountId} is set as primary. Set another account as primary before removing it.`;
  }
}
