import { DomainError } from '@/shared/types/domain.error';

export class PayoutExecutionFailedError extends DomainError {
  readonly code = 'PAYOUT_EXECUTION_FAILED';
  readonly message: string;

  constructor(readonly reason: string) {
    super();
    this.message = `Payout execution failed: ${reason}`;
  }
}
