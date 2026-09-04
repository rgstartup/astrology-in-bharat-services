import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class BankAccountNotFoundError extends DomainError {
  readonly code = 'EXPERT_BANK_ACCOUNT_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;
  readonly message = 'Bank account not found';
}
