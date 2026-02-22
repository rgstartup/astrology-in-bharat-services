import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';

@Injectable()
export class GetTotalEarningsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(userId: number, options: { startDate?: Date; endDate?: Date } = {}): Promise<number> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.wallet', 'wallet')
      .where('wallet.userId = :userId', { userId })
      .andWhere('transaction.type = :type', { type: TransactionType.CREDIT })
      .andWhere('transaction.purpose = :purpose', { purpose: TransactionPurpose.CONSULTATION });

    if (options.startDate) {
      query.andWhere('transaction.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      query.andWhere('transaction.createdAt <= :endDate', { endDate: options.endDate });
    }

    const total = await query
      .select('SUM(transaction.amount)', 'sum')
      .getRawOne();

    return Number(total.sum) || 0;
  }
}
