import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class PaymentProviderTokenExchangeFailedError extends DomainError {
  readonly code = 'PAYMENT_PROVIDER_TOKEN_EXCHANGE_FAILED';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly message = 'Payment provider token exchange failed';
}
