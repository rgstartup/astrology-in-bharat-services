import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionType, TransactionPurpose } from '../enum';

@Injectable()
export class GetGlobalEarningsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(): Promise<number> {
    const total = (await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.purpose = :purpose AND transaction.type = :type', {
        purpose: TransactionPurpose.RECHARGE,
        type: TransactionType.CREDIT,
      })
      .select('SUM(transaction.amount)', 'sum')
      .getRawOne()) as { sum?: string | number };

    return Number(total?.sum) || 0;
  }
}
