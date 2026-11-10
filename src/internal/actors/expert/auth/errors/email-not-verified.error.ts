import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@/shared/types/domain.error';

export class EmailNotVerifiedError extends DomainError {
  readonly code = 'EMAIL_NOT_VERIFIED';
  readonly message: string;
  readonly otpResent: boolean;
  readonly httpStatus = HttpStatus.CONFLICT;

  constructor(otpResent: boolean) {
    super();
    this.otpResent = otpResent;
    this.message = otpResent
      ? 'Please verify your email first. A new OTP has been sent to your email.'
      : 'Please verify your email first.';
  }
}
