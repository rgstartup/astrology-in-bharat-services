import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class KycAlreadyVerifiedError extends DomainError {
  readonly code = 'EXPERT_KYC_ALREADY_VERIFIED';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly message = 'Expert KYC status is already verified';
}
