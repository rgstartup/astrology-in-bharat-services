import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from '../../payment-gateway.interface';

@Injectable()
export class PaymentWebhookGuard implements CanActivate {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const isValid = this.paymentGateway.verifyWebhookSignature({
      headers: req.headers,
      body: req.body,
    });

    if (!isValid) {
      throw new UnauthorizedException(
        `Invalid ${this.paymentGateway.providerName} webhook signature`,
      );
    }

    return true;
  }
}
