import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class EmailAlreadyExistsError extends DomainError {
  readonly code = 'AUTH_EMAIL_ALREADY_EXISTS';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly message = 'Email already exists';
}
