import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class SessionExpiredError extends DomainError {
  readonly code = 'AUTH_SESSION_EXPIRED';
  readonly message = 'Session Expired';
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}
