import { DomainError } from '@/shared/types/domain.error';

export class OtpExpiredError extends DomainError {
  readonly code = 'OTP_EXPIRED';
  readonly message = 'OTP has expired. Please request a new OTP.';
}
