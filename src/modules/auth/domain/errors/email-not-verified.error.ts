import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class EmailNotVerifiedError extends DomainError {
  readonly code = 'AUTH_EMAIL_NOT_VERIFIED';
  readonly message = 'Email not verified';
  readonly httpStatus = HttpStatus.FORBIDDEN;
}


export class RequiredRoleMissingError extends DomainError {
  readonly code = 'AUTH_REQUIRED_ROLE_MISSING';
  readonly message = 'Required role is missing for login';
  readonly httpStatus = HttpStatus.FORBIDDEN;
}