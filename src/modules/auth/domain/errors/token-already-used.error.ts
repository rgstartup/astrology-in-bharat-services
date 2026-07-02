import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class TokenAlreadyUsedError extends DomainError {
  readonly code = 'AUTH_TOKEN_ALREADY_USED';
  readonly message = 'Token already used';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
}
