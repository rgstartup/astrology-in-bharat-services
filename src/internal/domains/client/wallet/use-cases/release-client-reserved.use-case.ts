import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ClientWallet } from '../entities/client-wallet.entity';
import { ClientTransaction } from '../entities/client-transaction.entity';
import { ClientTransactionPurpose, ClientTransactionType } from '../enum';

@Injectable()
export class ReleaseClientReservedUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    clientId: number,
    amount: number,
    referenceId: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<void> {
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

      if (!wallet || Number(wallet.reserved_balance) < amount) {
        throw new BadRequestException(
          'Insufficient reserved balance to release',
        );
      }

      const balanceBefore = Number(wallet.balance) || 0;
      const balanceAfter = balanceBefore + Number(amount);

      wallet.reserved_balance =
        Number(wallet.reserved_balance) - Number(amount);
      wallet.balance = balanceAfter;
      await qr.manager.save(ClientWallet, wallet);

      const transaction = qr.manager.create(ClientTransaction, {
        wallet_id: wallet.id,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: ClientTransactionType.RELEASE,
        purpose: ClientTransactionPurpose.REFUND,
        reference_id: referenceId,
      });
      await qr.manager.save(ClientTransaction, transaction);

      if (!externalQueryRunner) {
        await qr.commitTransaction();
      }
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
