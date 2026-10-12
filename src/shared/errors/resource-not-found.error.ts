import { NotFoundDomainError } from './not-found.error';

/**
 * Generic fallback for "not found" failures without a dedicated error class.
 *
 * Prefer a feature-specific subclass (e.g. `ProductNotFoundError extends
 * NotFoundDomainError` in the feature's `errors/` directory) when the client
 * needs a stable per-resource `code`. Use this only as a stopgap while
 * migrating generic Nest `NotFoundException` throws.
 *
 * The identifier stays in the typed `resourceId` field so it is available
 * to logs/handlers without being interpolated into the user-facing message.
 */
export class ResourceNotFoundError extends NotFoundDomainError {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly message: string;
  readonly resourceId?: string | number;
  readonly resource: string;

  constructor(resource: string, resourceId?: string | number) {
    super();
    this.resourceId = resourceId;
    this.resource = resource;
    this.name = 'ResourceNotFoundError';
    this.message = `${resource} not found or doesn't exist`;
  }
}
