import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';
import { Wallet } from '@/modules/wallet/infrastructure/persistence/entities/wallet.entity';
import { Withdrawal, WithdrawalStatus } from '@/modules/wallet/infrastructure/persistence/entities/withdrawal.entity';

@Injectable()
export class GetMerchantTransactionsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepo: Repository<Withdrawal>,
  ) {}

  async execute(userId: number, options: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 10 } = options;

    const wallet = await this.walletRepo.findOne({ where: { user_id: userId } });
    if (!wallet) {
      return { transactions: [], total: 0, page, limit };
    }

    const query = this.transactionRepo
      .createQueryBuilder('t')
      .where('t.wallet_id = :walletId', { walletId: wallet.id })
      .orderBy('t.created_at', 'DESC');

    if (search) {
      query.andWhere('(t.reference_id LIKE :search OR CAST(t.id AS TEXT) LIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [transactions, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Map transactions and handle withdrawal status if needed
    const mappedTransactions = await Promise.all(
      transactions.map(async (txn) => {
        let type = 'sale';
        let status = 'completed';
        let orderId: string | null = null;

        if (txn.purpose === TransactionPurpose.WITHDRAWAL) {
          type = 'withdrawal';
          // For withdrawals, we might want to check the actual withdrawal status
          // Since there's no direct link, we'll try to find a matching withdrawal by amount and time proximity
          // or just default to 'paid' if it's a debit.
          status = 'paid'; 
        } else if (txn.purpose === TransactionPurpose.PRODUCT_PURCHASE) {
          type = 'sale';
          status = 'completed';
          // Extract order ID from reference_id like "order_123_fulfillment_credit"
          if (txn.reference_id?.startsWith('order_')) {
            const parts = txn.reference_id.split('_');
            orderId = `ORD-${parts[1]}`;
          }
        }

        return {
          id: `TXN${txn.id}`,
          orderId,
          date: txn.created_at.toISOString(),
          amount: Number(txn.amount),
          type,
          status,
        };
      })
    );

    return {
      transactions: mappedTransactions,
      total,
      page,
      limit,
    };
  }
}
