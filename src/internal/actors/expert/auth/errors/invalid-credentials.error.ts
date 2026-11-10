import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@/shared/types/domain.error';

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly message = 'Invalid email or password';
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}
