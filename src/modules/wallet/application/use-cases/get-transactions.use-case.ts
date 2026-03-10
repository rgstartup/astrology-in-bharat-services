import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../infrastructure/persistence/entities/transaction.entity';
import { Withdrawal } from '../../infrastructure/persistence/entities/withdrawal.entity';
import { GetWalletUseCase } from './get-wallet.use-case';

@Injectable()
export class GetTransactionsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) { }

  async execute(
    userId: number,
    page = 1,
    limit = 10,
    type = 'all',
    purpose?: string,
  ) {
    const wallet = await this.getWalletUseCase.execute(userId);
    const query = this.transactionRepository
      .createQueryBuilder('t')
      .where('t.wallet_id = :walletId', { walletId: wallet.id });

    if (type !== 'all') {
      query.andWhere('t.type = :type', { type });
    }

    if (purpose) {
      query.andWhere('t.purpose = :purpose', { purpose });
    }

    const [items, total] = await query
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Map withdrawals for the bank account ID
    const transactionsWithBankAccounts = await Promise.all(items.map(async (tx) => {
      let bank_account: number | null = null;
      let status = 'completed'; // Default

      if (tx.purpose === 'withdrawal') {
        const withdrawal = await this.transactionRepository.manager.findOne(Withdrawal, {
          where: { user_id: userId, amount: tx.amount },
          order: { created_at: 'DESC' },
        });

        if (withdrawal) {
          bank_account = withdrawal.bank_account_id;
          status = withdrawal.status;
        }
      }

      return {
        ...tx,
        bank_account,
        status,
        description: tx.purpose.charAt(0).toUpperCase() + tx.purpose.slice(1).replace('_', ' '),
      };
    }));

    return { items: transactionsWithBankAccounts, total, page, limit };
  }
}
