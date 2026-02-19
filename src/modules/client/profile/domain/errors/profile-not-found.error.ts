import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class ProfileNotFoundError extends DomainError {
  readonly code = 'CLIENT_PROFILE_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;
  readonly message = 'Client profile not found';
}
