import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class BankLinkStateInvalidError extends DomainError {
  readonly code = 'BANK_LINK_STATE_INVALID';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly message = 'Invalid or expired link state';
}
