import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class InvalidTokenError extends DomainError {
  readonly code = 'AUTH_TOKEN_INVALID';
  readonly message = 'Invalid Token';
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}

export class InvalidRefreshTokenError extends DomainError {
  readonly code = 'AUTH_REFERSH_TOKEN_INVALID';
  readonly message = 'Invalid Refresh Token';
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}
