import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class PayoutAccountNotFoundError extends DomainError {
  readonly code = 'PAYOUT_ACCOUNT_NOT_FOUND';
  readonly message: string;
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(readonly payoutAccountId: number) {
    super();
    this.message = `Payout account not found: ${payoutAccountId}`;
  }
}
