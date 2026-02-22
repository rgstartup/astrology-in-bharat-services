import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class InsufficientBalanceError extends DomainError {
  readonly code = 'INSUFFICIENT_BALANCE';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly message = 'Insufficient wallet balance';
}
