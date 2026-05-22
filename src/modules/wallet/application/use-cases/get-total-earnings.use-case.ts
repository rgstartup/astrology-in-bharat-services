import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/entities/transaction.entity';

@Injectable()
export class GetTotalEarningsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) { }

  async execute(userId: string, options: { startDate?: Date; endDate?: Date } = {}): Promise<number> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.wallet', 'wallet')
      .where('wallet.client_id = :userId', { userId })
      .andWhere('transaction.type = :type', { type: TransactionType.CREDIT })
      .andWhere('transaction.purpose IN (:...purposes)', { purposes: [TransactionPurpose.CONSULTATION, TransactionPurpose.PRODUCT_PURCHASE, TransactionPurpose.AGENT_COMMISSION] });

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
