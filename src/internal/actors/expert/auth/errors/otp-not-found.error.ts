import { DomainError } from '@/shared/types/domain.error';

export class OtpNotFoundError extends DomainError {
  readonly code = 'OTP_NOT_FOUND';
  readonly message = 'Invalid or expired OTP';
}
