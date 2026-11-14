import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class PayoutAccountNotLinkedError extends DomainError {
  readonly code = 'PAYOUT_ACCOUNT_NOT_LINKED';
  readonly message: string;
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(readonly payoutAccountId: number, readonly expertId: number) {
    super();
    this.message = `Payout account ${payoutAccountId} not linked to expert ${expertId}`;
  }
}
