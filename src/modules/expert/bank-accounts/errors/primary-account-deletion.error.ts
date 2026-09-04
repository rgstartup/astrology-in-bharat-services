import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class PrimaryAccountDeletionError extends DomainError {
  readonly code = 'EXPERT_PRIMARY_ACCOUNT_DELETION';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly message =
    'Cannot delete primary bank account. Set another account as primary first.';
}
