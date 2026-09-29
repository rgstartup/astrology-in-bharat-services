import { QueryRunner } from 'typeorm';
import { GatewayTransaction } from '@/internal/finance/payments/entities/gateway-transaction.entity';
import { GatewayIntent } from '@/internal/finance/payments/enums/gateway-intent.enum';

export interface IPaymentIntentHandler {
  readonly intent: GatewayIntent;
  handleOrderCreated?(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void>;
  handleSuccess(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void>;
  handleFailure?(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void>;
}
