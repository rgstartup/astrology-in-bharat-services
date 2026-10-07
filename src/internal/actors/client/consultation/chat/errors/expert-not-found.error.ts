import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@/shared/types/domain.error';

export class ExpertNotFoundError extends DomainError {
  readonly code = 'EXPERT_NOT_FOUND';
  readonly message = 'Expert not found';
  readonly httpStatus = HttpStatus.NOT_FOUND;
}
