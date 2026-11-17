import { DomainError } from '@/shared/types/domain.error';

export class NoFundAccountReferenceError extends DomainError {
  readonly code = 'NO_FUND_ACCOUNT_REFERENCE';
  readonly message: string;

  constructor(readonly payoutAccountId: number) {
    super();
    this.message = `No fund_account reference found for payout account ${payoutAccountId}`;
  }
}
