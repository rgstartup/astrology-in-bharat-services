import { DomainError } from '@/shared/types/domain.error';

export class OtpMaxAttemptsError extends DomainError {
  readonly code = 'OTP_MAX_ATTEMPTS_EXCEEDED';
  readonly message =
    'Maximum verification attempts exceeded. Please request a new OTP.';
}
