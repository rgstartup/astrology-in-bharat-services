import { DomainError } from '@/shared/types/domain.error';

export class ExpertAccountNotFoundError extends DomainError {
  readonly code = 'EXPERT_ACCOUNT_NOT_FOUND';
  readonly httpStatus = 404;
  readonly message = 'Expert account not found';
}

export class InvalidSpecializationSelectionError extends DomainError {
  readonly code = 'INVALID_SPECIALIZATION_SELECTION';
  readonly message =
    'One or more selected specializations are invalid or inactive';
}
