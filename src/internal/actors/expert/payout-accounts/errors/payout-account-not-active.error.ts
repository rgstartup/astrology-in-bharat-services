import { DomainError } from '@/shared/types/domain.error';

export class PayoutAccountNotActiveError extends DomainError {
  readonly code = 'PAYOUT_ACCOUNT_NOT_ACTIVE';
  readonly message: string;

  constructor(readonly status: string) {
    super();
    this.message = `Payout account is not active (status: ${status})`;
  }
}
