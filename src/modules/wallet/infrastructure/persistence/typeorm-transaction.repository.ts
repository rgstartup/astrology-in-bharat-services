import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '@/modules/wallet/domain/entities/transaction.entity';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';

@Injectable()
export class TypeOrmTransactionRepository implements ITransactionRepository {
    constructor(
        @InjectRepository(Transaction)
        private readonly repository: Repository<Transaction>,
    ) { }

    async save(transaction: Transaction): Promise<Transaction> {
        return this.repository.save(transaction);
    }

    create(data: Partial<Transaction>): Transaction {
        return this.repository.create(data);
    }

    async findByWalletId(walletId: number, options: { page: number, limit: number, type?: string, purpose?: string }): Promise<[Transaction[], number]> {
        const query = this.repository
            .createQueryBuilder('t')
            .where('t.walletId = :walletId', { walletId });

        if (options.type && options.type !== 'all') {
            query.andWhere('t.type = :type', { type: options.type });
        }

        if (options.purpose) {
            query.andWhere('t.purpose = :purpose', { purpose: options.purpose });
        }

        return query
            .orderBy('t.createdAt', 'DESC')
            .skip((options.page - 1) * options.limit)
            .take(options.limit)
            .getManyAndCount();
    }

    async sumAmount(filters: { userId?: number, type?: string, purpose?: string }): Promise<number> {
        const query = this.repository.createQueryBuilder('transaction');

        if (filters.userId) {
            query.innerJoin('transaction.wallet', 'wallet')
                .andWhere('wallet.userId = :userId', { userId: filters.userId });
        }

        if (filters.type) {
            query.andWhere('transaction.type = :type', { type: filters.type });
        }

        if (filters.purpose) {
            query.andWhere('transaction.purpose = :purpose', { purpose: filters.purpose });
        }

        const result = await query.select('SUM(transaction.amount)', 'sum').getRawOne();
        return Number(result.sum) || 0;
    }
}
