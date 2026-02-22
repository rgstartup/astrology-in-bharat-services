import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class TodoNotFoundError extends DomainError {
  readonly code = 'TODO_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;
  readonly message = 'Todo not found';
}
