import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { IPaymentIntentHandler } from '@/internal/finance/payments/interfaces/payment-intent-handler.interface';
import { GatewayIntent } from '@/internal/finance/payments/enums/gateway-intent.enum';
import { GatewayTransaction } from '@/internal/finance/payments/entities/gateway-transaction.entity';
import { PaymentIntentDispatcher } from '@/internal/finance/payments/services/payment-intent-dispatcher.service';
import { ClientWalletService } from '../wallet.service';

@Injectable()
export class WalletRechargeIntentHandler
  implements IPaymentIntentHandler, OnModuleInit
{
  readonly intent = GatewayIntent.WALLET_RECHARGE;
  private readonly logger = new Logger(WalletRechargeIntentHandler.name);

  constructor(
    private readonly clientWalletService: ClientWalletService,
    private readonly dispatcher: PaymentIntentDispatcher,
  ) {}

  onModuleInit() {
    this.dispatcher.registerHandler(this);
  }

  async handleOrderCreated(
    transaction: GatewayTransaction,
    _qr: QueryRunner,
  ): Promise<void> {
    this.logger.log(
      `Wallet recharge order created for client ${transaction.client_id}, gateway order ${transaction.gateway_order_id}`,
    );
  }

  async handleSuccess(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void> {
    const clientId = transaction.client_id;
    if (!clientId) {
      throw new Error(
        `Cannot top up client wallet: client_id missing on transaction ${transaction.id}`,
      );
    }

    this.logger.log(
      `Fulfilling client wallet recharge for client ${clientId}, amount: ${transaction.amount}`,
    );

    await this.clientWalletService.recharge(
      clientId,
      transaction.amount,
      qr,
      `gateway_${transaction.gateway_payment_id || transaction.id}`,
      'gateway_recharge',
      {
        ...transaction.metadata,
        gateway_name: transaction.gateway_name,
        gateway_order_id: transaction.gateway_order_id,
        gateway_payment_id: transaction.gateway_payment_id,
        gateway_signature: transaction.gateway_signature,
      },
    );
  }
}
