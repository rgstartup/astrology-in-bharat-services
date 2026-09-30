import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain.error';

export class ValidationDomainError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly message: string;
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    fieldErrors: Record<string, string[]>,
    message = 'Please correct the highlighted fields.',
  ) {
    super(message);
    this.name = 'ValidationDomainError';
    this.message = message;
    this.fieldErrors = fieldErrors;
  }
}
