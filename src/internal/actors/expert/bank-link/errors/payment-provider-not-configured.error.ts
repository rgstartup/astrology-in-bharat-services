import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class PaymentProviderDriverNotConfiguredError extends DomainError {
  readonly code = 'PAYMENT_PROVIDER_DRIVER_NOT_CONFIGURED';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly message = 'Payment provider driver not configured';
}
