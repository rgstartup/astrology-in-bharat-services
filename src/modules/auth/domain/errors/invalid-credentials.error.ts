import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class InvalidCredentialsError extends DomainError {
  readonly code = 'AUTH_INVALID_CREDENTIALS';
  readonly message = 'Invalid credentials';
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}
