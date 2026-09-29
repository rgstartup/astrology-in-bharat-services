import { QueryRunner } from 'typeorm';
import { GatewayTransaction } from '../entities/gateway-transaction.entity';
import { GatewayIntent } from '../enums/gateway-intent.enum';

export interface IPaymentIntentHandler {
  readonly intent: GatewayIntent;
  handleSuccess(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void>;
  handleFailure?(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void>;
}
