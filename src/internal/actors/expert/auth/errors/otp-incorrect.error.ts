import { DomainError } from '@/shared/types/domain.error';

export class OtpIncorrectError extends DomainError {
  readonly code = 'OTP_INCORRECT';
  readonly message = 'Invalid OTP';
}
