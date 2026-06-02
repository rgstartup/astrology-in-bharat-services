import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/entities/transaction.entity';
import { GetWalletUseCase } from './get-wallet.use-case';

@Injectable()
export class GetTotalEarningsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) { }

  async execute(userId: string, options: { startDate?: Date; endDate?: Date } = {}): Promise<number> {
    const wallet = await this.getWalletUseCase.execute(userId);

    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.wallet_id = :walletId', { walletId: wallet.id })
      .andWhere('transaction.type = :type', { type: TransactionType.CREDIT })
      .andWhere('transaction.purpose IN (:...purposes)', { purposes: [TransactionPurpose.CONSULTATION, TransactionPurpose.PRODUCT_PURCHASE, TransactionPurpose.AGENT_COMMISSION, TransactionPurpose.PUJA_CONFIRMATION] });

    if (options.startDate) {
      query.andWhere('transaction.created_at >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      query.andWhere('transaction.created_at <= :endDate', { endDate: options.endDate });
    }

    const total = await query
      .select('SUM(transaction.amount)', 'sum')
      .getRawOne();

    return Number(total.sum) || 0;
  }
}
