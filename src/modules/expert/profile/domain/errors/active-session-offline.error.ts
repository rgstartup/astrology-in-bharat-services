import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class ActiveSessionOfflineError extends DomainError {
  readonly code = 'EXPERT_ACTIVE_SESSION_OFFLINE';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly message =
    'You cannot go offline while you have an active chat session. Please end the session first.';
}
