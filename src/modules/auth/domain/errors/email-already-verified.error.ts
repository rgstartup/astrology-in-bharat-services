import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class EmailAlreadyVerifiedError extends DomainError {
  readonly code = 'AUTH_EMAIL_ALREADY_VERIFIED';
  readonly message = 'Email already verified';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
}
