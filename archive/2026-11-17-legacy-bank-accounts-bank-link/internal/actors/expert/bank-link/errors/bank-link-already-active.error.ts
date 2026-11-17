import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class BankLinkAlreadyActiveError extends DomainError {
  readonly code = 'BANK_LINK_ALREADY_ACTIVE';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly message = 'Payout account link is already active';
}
