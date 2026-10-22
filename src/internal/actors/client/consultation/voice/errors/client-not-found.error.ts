import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@/shared/types/domain.error';

export class ClientNotFoundError extends DomainError {
  readonly code = 'CLIENT_NOT_FOUND';
  readonly message = "Client not found or doesn't exist";
  readonly httpStatus = HttpStatus.NOT_FOUND;
}
