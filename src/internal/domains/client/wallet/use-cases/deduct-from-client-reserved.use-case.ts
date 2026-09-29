import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ClientWallet } from '../entities/client-wallet.entity';
import { ClientTransaction } from '../entities/client-transaction.entity';
import { ClientTransactionPurpose, ClientTransactionType } from '../enum';
import { ClientAccount } from '../../account/entities/account.entity';

@Injectable()
export class DeductFromClientReservedUseCase {
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
        throw new BadRequestException('Insufficient reserved balance');
      }

      const balanceBefore = Number(wallet.balance) || 0;

      wallet.reserved_balance =
        Number(wallet.reserved_balance) - Number(amount);
      await qr.manager.save(ClientWallet, wallet);

      const transaction = qr.manager.create(ClientTransaction, {
        wallet_id: wallet.id,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceBefore,
        type: ClientTransactionType.DEBIT,
        purpose: ClientTransactionPurpose.CONSULTATION,
        reference_id: referenceId,
      });
      await qr.manager.save(ClientTransaction, transaction);

      // Update client spending tracking
      try {
        await qr.manager
          .createQueryBuilder()
          .update(ClientAccount)
          .set({
            total_spending: () =>
              `COALESCE(total_spending, 0) + ${Number(amount)}`,
          })
          .where('id = :id', { id: clientId })
          .execute();
      } catch (trackingError) {
        console.error(
          '[CLIENT_DEDUCT_RESERVED_TRACKING] Failed to track client spending:',
          trackingError,
        );
      }

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
