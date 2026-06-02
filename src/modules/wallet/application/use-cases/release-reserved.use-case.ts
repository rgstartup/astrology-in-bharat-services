import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet } from '../../infrastructure/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/entities/transaction.entity';

@Injectable()
export class ReleaseReservedUseCase {
  constructor(private readonly dataSource: DataSource) { }

  async execute(
    userId: string,
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
      // --- START WALLET LOOKUP ---
      const { ProfileClient } = await import('../../../client/profile/infrastructure/entities/profile-client.entity');
      const { ProfileExpert } = await import('../../../expert/profile/infrastructure/entities/profile-expert.entity');
      const { ProfileMerchant } = await import('../../../merchant/profile/infrastructure/entities/profile-merchant.entity');
      const { ProfileAgent } = await import('../../../agent/infrastructure/entities/profile-agent.entity');

      let walletOwnerId = '';
      let queryKey = '';

      const expert = await qr.manager.findOne(ProfileExpert, { where: { user: { id: userId } } });
      if (expert) { walletOwnerId = expert.id; queryKey = 'expert_id'; }
      
      if (!walletOwnerId) {
         const merchant = await qr.manager.findOne(ProfileMerchant, { where: { user: { id: userId } } });
         if (merchant) { walletOwnerId = merchant.id; queryKey = 'merchant_id'; }
      }

      if (!walletOwnerId) {
         const agent = await qr.manager.findOne(ProfileAgent, { where: { user: { id: userId } } });
         if (agent) { walletOwnerId = agent.id; queryKey = 'agent_id'; }
      }

      if (!walletOwnerId) {
         const client = await qr.manager.findOne(ProfileClient, { where: { user: { id: userId } } });
         if (client) { walletOwnerId = client.id; queryKey = 'client_id'; }
      }

      const wallet = await qr.manager.findOne(Wallet, {
        where: { [queryKey || 'client_id']: walletOwnerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet || Number(wallet.reserved_balance) < amount) {
        throw new BadRequestException('Insufficient reserved balance to release');
      }

      const balanceBefore = Number(wallet.balance) || 0;
      const balanceAfter = balanceBefore + Number(amount);

      wallet.reserved_balance = Number(wallet.reserved_balance) - Number(amount);
      wallet.balance = balanceAfter;
      await qr.manager.save(wallet);

      const transaction = qr.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: TransactionType.RELEASE,
        purpose: TransactionPurpose.REFUND,
        reference_id: referenceId,
      });
      await qr.manager.save(transaction);

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
