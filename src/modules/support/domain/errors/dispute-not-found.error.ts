import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class DisputeNotFoundError extends DomainError {
  readonly code = 'SUPPORT_DISPUTE_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;
  readonly message = 'Support dispute not found';
}
