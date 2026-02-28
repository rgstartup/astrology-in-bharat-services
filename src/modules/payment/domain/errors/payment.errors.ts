import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class InvalidPaymentSignatureError extends DomainError {
  readonly code = 'PAYMENT_INVALID_SIGNATURE';
  readonly message = 'Invalid payment signature';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
}

export class InvalidWebhookSignatureError extends DomainError {
  readonly code = 'PAYMENT_INVALID_WEBHOOK_SIGNATURE';
  readonly message = 'Invalid webhook signature';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
}

export class PaymentOrderNotFoundError extends DomainError {
  readonly code = 'PAYMENT_ORDER_NOT_FOUND';
  readonly message = 'Payment order not found';
  readonly httpStatus = HttpStatus.NOT_FOUND;
}

export class PaymentOrderCreationFailedError extends DomainError {
  readonly code = 'PAYMENT_ORDER_CREATION_FAILED';
  readonly message = 'Payment order creation failed';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
}

export class PaymentVerificationFailedError extends DomainError {
  readonly code = 'PAYMENT_VERIFICATION_FAILED';
  readonly message = 'Failed to process payment verification';
  readonly httpStatus = HttpStatus.BAD_REQUEST;
}
