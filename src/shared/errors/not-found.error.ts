import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain.error';

/**
 * Base class for all "not found" domain errors.
 *
 * Fixes the HTTP status to 404 so feature errors only declare
 * their stable `code`, user-facing `message`, and typed context fields.
 */
export abstract class NotFoundDomainError extends DomainError {
  readonly httpStatus = HttpStatus.NOT_FOUND;
}
