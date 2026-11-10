import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@/shared/types/domain.error';

export class AccountSuspendedError extends DomainError {
  readonly code = 'ACCOUNT_SUSPENDED';
  readonly message = 'Your account has been suspended';
  readonly httpStatus = HttpStatus.FORBIDDEN;
}
