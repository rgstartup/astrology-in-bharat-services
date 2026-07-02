import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class ProfileNotFoundError extends DomainError {
  readonly code = 'EXPERT_PROFILE_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;
  readonly message = 'Expert profile not found';
}
