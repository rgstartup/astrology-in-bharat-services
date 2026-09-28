import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ClientWallet } from '../entities/client-wallet.entity';
import { ClientTransaction } from '../entities/client-transaction.entity';
import { ClientTransactionPurpose, ClientTransactionType } from '../enum';
import { InsufficientBalanceError } from '@/internal/finance/wallet/domain/errors/insufficient-balance.error';

@Injectable()
export class ReserveClientBalanceUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    clientId: number,
    amount: number,
    referenceId: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<boolean> {
    const qr = externalQueryRunner || this.dataSource.createQueryRunner();

    if (!externalQueryRunner) {
      await qr.connect();
      await qr.startTransaction();
    }

    try {
      const wallet = await qr.manager.findOne(ClientWallet, {
        where: { client_id: clientId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet || Number(wallet.balance) < amount) {
        throw new InsufficientBalanceError();
      }

      const balanceBefore = Number(wallet.balance) || 0;
      const balanceAfter = balanceBefore - Number(amount);

      wallet.balance = balanceAfter;
      wallet.reserved_balance =
        Number(wallet.reserved_balance) + Number(amount);
      await qr.manager.save(ClientWallet, wallet);

      const transaction = qr.manager.create(ClientTransaction, {
        wallet_id: wallet.id,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: ClientTransactionType.HOLD,
        purpose: ClientTransactionPurpose.CONSULTATION,
        reference_id: referenceId,
      });
      await qr.manager.save(ClientTransaction, transaction);

      if (!externalQueryRunner) {
        await qr.commitTransaction();
      }
      return true;
    } catch (err) {
      if (!externalQueryRunner && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      throw err;
    } finally {
      if (!externalQueryRunner) {
        await qr.release();
      }
    }
  }
}
