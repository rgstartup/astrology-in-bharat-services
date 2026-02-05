import { Transaction } from '../entities/transaction.entity';

export interface ITransactionRepository {
    save(transaction: Transaction): Promise<Transaction>;
    create(data: Partial<Transaction>): Transaction;
    findByWalletId(walletId: number, options: { page: number, limit: number, type?: string, purpose?: string }): Promise<[Transaction[], number]>;
    sumAmount(filters: { userId?: number, type?: string, purpose?: string }): Promise<number>;
}

export const ITransactionRepository = Symbol('ITransactionRepository');
