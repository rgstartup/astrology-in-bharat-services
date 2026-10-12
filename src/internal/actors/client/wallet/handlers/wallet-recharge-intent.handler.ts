import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '@/core/enums';
import { IPaymentIntentHandler } from '@/internal/finance/payments/interfaces/payment-intent-handler.interface';
import { GatewayIntent } from '@/internal/finance/payments/enums/gateway-intent.enum';
import { GatewayTransaction } from '@/internal/finance/payments/entities/gateway-transaction.entity';
import { ClientWallet } from '../entities/client-wallet.entity';
import { ClientTransaction } from '../entities/client-transaction.entity';
import { ClientWalletRecharge } from '../entities/client-wallet-recharge.entity';
import { GeneralLedgerEntry } from '@/internal/finance/ledger/entities/general-ledger-entry.entity';
import { PaymentIntentDispatcher } from '@/internal/finance/payments/services/payment-intent-dispatcher.service';
import {
  ClientRechargeStatus,
  ClientTransactionPurpose,
  ClientTransactionType,
} from '../enum';
import { WalletRechargeFulfillmentService } from './wallet-recharge-fulfillment.service';
import { randomBytes } from 'crypto';

@Injectable()
export class WalletRechargeIntentHandler
  implements IPaymentIntentHandler, OnModuleInit
{
  readonly intent = GatewayIntent.WALLET_RECHARGE;
  private readonly logger = new Logger(WalletRechargeIntentHandler.name);

  constructor(
    private readonly dispatcher: PaymentIntentDispatcher,
    private readonly fulfillment: WalletRechargeFulfillmentService,
    @Inject(DRIZZLE) private readonly drizzle: DrizzleDb,
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

    const amount = Number(transaction.amount);
    const metadata: Record<string, any> = {
      ...transaction.metadata,
      gateway_name: transaction.gateway_name,
      gateway_order_id: transaction.gateway_order_id,
      gateway_payment_id: transaction.gateway_payment_id,
      gateway_signature: transaction.gateway_signature,
    };
    const bonusAmount = Number(metadata?.bonus_amount) || 0;
    const totalCredit = amount + bonusAmount;
    const referenceId = `gateway_${transaction.gateway_payment_id || transaction.id}`;

    this.logger.log(
      `Fulfilling client wallet recharge for client ${clientId}, amount: ${amount}`,
    );
    this.logger.log(
      `[CLIENT_RECHARGE_TX] Client: ${clientId}, Amount: ${amount}, Reference: ${referenceId}`,
    );
    this.logger.log(`wallet recharge metadata :: ${JSON.stringify(metadata)}`);

    // Dispatched from webhook / verify-payment inside the caller's TypeORM
    // transaction: stay in its QueryRunner so the credit is atomic with the
    // payment marking. Drizzle path covers any standalone invocation.
    if (qr) {
      await this.fulfillWithQueryRunner(
        qr,
        clientId,
        amount,
        bonusAmount,
        totalCredit,
        referenceId,
        metadata,
      );
      return;
    }

    await this.drizzle.transaction(async (tx) => {
      await this.fulfillment.fulfillTx(tx, {
        clientId,
        amount,
        bonusAmount,
        totalCredit,
        referenceId,
        metadata,
      });
    });
  }

  private async fulfillWithQueryRunner(
    qr: QueryRunner,
    clientId: number,
    amount: number,
    bonusAmount: number,
    totalCredit: number,
    referenceId: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    const existingWallet = await qr.manager.findOne(ClientWallet, {
      where: { client_id: clientId },
      lock: { mode: 'pessimistic_write' },
    });

    let wallet = existingWallet;
    if (!wallet) {
      wallet = await qr.manager.save(
        ClientWallet,
        qr.manager.create(ClientWallet, {
          client_id: clientId,
          balance: 0,
          reserved_balance: 0,
        }),
      );
    }

    await qr.manager
      .createQueryBuilder()
      .update(ClientWallet)
      .set({ balance: () => `balance + ${Number(totalCredit)}` })
      .where('id = :walletId', { walletId: wallet.id })
      .execute();

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = balanceBefore + totalCredit;
    wallet.balance = balanceAfter;

    const savedTx = await qr.manager.save(
      ClientTransaction,
      qr.manager.create(ClientTransaction, {
        wallet_id: wallet.id,
        amount: totalCredit,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: ClientTransactionType.CREDIT,
        purpose: ClientTransactionPurpose.RECHARGE,
        reference_id: referenceId,
        reference_type: 'gateway_recharge',
        metadata: metadata ?? null,
        transaction_no: randomBytes(16).toString('hex'),
      }),
    );

    await qr.manager.save(
      ClientWalletRecharge,
      qr.manager.create(ClientWalletRecharge, {
        wallet_id: wallet.id,
        amount,
        bonus_amount: bonusAmount,
        gst_amount: Number(metadata?.gst_amount) || 0,
        total_payable: Number(metadata?.total_payable) || amount,
        status: ClientRechargeStatus.SUCCESS,
        payment_gateway: metadata?.gateway_name || 'razorpay',
        gateway_order_id: metadata?.gateway_order_id || null,
        gateway_payment_id:
          metadata?.gateway_payment_id || referenceId || null,
        gateway_signature: metadata?.gateway_signature || null,
        wallet_transaction_id: savedTx.id,
        metadata: metadata ?? null,
      }),
    );

    await qr.manager.save(
      GeneralLedgerEntry,
      qr.manager.create(GeneralLedgerEntry, {
        event_id: referenceId ?? null,
        event_type: GeneralLedgerEventType.RECHARGE,
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type: GeneralLedgerPartyType.CLIENT,
        party_id: clientId,
        amount: totalCredit,
        note: `Client wallet recharge: ₹${amount}${bonusAmount > 0 ? ` + ₹${bonusAmount} bonus` : ''}`,
      }),
    );

    await this.fulfillment.notifyRecharge(clientId, totalCredit, referenceId);
  }
}
