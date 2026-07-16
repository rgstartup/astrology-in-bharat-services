import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionPurpose,
} from '../../infrastructure/entities/transaction.entity';

@Injectable()
export class GetAdminCommissionUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(): Promise<number> {
    const result: { sum: string | null } | undefined =
      await this.transactionRepository
        .createQueryBuilder('transaction')
        .where('transaction.type = :type', { type: TransactionType.DEBIT })
        .andWhere('transaction.purpose IN (:...purposes)', {
          purposes: [
            TransactionPurpose.CONSULTATION,
            TransactionPurpose.PRODUCT_PURCHASE,
            TransactionPurpose.PUJA_CONFIRMATION,
          ],
        })
        .select('SUM(transaction.amount)', 'sum')
        .getRawOne();

    const totalRevenue = Number(result?.sum) || 0;
    // Assuming 3% commission as default if not explicitly recorded as transactions
    return totalRevenue * 0.03;
  }
}
