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
        let remark: string | null = null;
        let info = 'Transaction';
        let typeLabel = 'Credit';
        let color = 'green';
        let icon = 'in';

        if (txn.purpose === TransactionPurpose.WITHDRAWAL) {
          type = 'withdrawal';
          status = 'paid';
          info = 'Withdrawal Request';
          typeLabel = 'Debit';
          color = 'red';
          icon = 'out';
        } else if (txn.purpose === TransactionPurpose.REFUND) {
          type = 'refund';
          status = 'completed';
          typeLabel = 'Credit';
          color = 'green';
          icon = 'in';
          
          if (txn.reference_id?.startsWith('REFUND-WD-')) {
            const withdrawalId = parseInt(txn.reference_id.replace('REFUND-WD-', ''));
            const withdrawal = await this.withdrawalRepo.findOne({ where: { id: withdrawalId } });
            if (withdrawal) {
                orderId = `WD-${withdrawalId}`;
                info = `Refund for Withdrawal #${withdrawalId}`;
                remark = withdrawal.remark || 'Withdrawal Refunded';
            }
          }
        } else if (txn.purpose === TransactionPurpose.PRODUCT_PURCHASE || txn.purpose === TransactionPurpose.CONSULTATION) {
          type = 'sale';
          status = 'completed';
          typeLabel = 'Credit';
          color = 'green';
          icon = 'in';
          if (txn.reference_id?.includes('order_')) {
            const parts = txn.reference_id.split('_');
            const idPart = parts.find(p => !isNaN(Number(p)));
            if (idPart) {
                orderId = `ORD-${idPart}`;
                info = `Order #${idPart}`;
            }
          }
        }

        const amountSign = typeLabel === 'Credit' ? '+' : '-';

        return {
          id: txn.transaction_no || `TXN${txn.id}`,
          orderId,
          date: txn.created_at.toISOString(),
          amount: Number(txn.amount),
          amountLabel: `${amountSign} ₹${Number(txn.amount).toLocaleString('en-IN')}`,
          type,
          typeLabel,
          color,
          icon,
          info,
          status,
          remark: remark || txn.reference_id,
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
