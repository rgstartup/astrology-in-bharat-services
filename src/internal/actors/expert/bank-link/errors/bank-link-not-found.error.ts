import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class BankLinkNotFoundError extends DomainError {
  readonly code = 'BANK_LINK_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;
  readonly message = 'Payout account link not found';
}
