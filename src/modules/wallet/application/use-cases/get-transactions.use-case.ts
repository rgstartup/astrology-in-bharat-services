import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../infrastructure/persistence/entities/transaction.entity';
import { GetWalletUseCase } from './get-wallet.use-case';

@Injectable()
export class GetTransactionsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

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
      .where('t.walletId = :walletId', { walletId: wallet.id });

    if (type !== 'all') {
      query.andWhere('t.type = :type', { type });
    }

    if (purpose) {
      query.andWhere('t.purpose = :purpose', { purpose });
    }

    const [items, total] = await query
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }
}
