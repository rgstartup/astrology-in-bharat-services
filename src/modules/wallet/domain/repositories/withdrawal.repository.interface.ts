import { Withdrawal } from '../entities/withdrawal.entity';

export interface IWithdrawalRepository {
    save(withdrawal: Withdrawal): Promise<Withdrawal>;
    create(data: Partial<Withdrawal>): Withdrawal;
    getWithdrawalStats(userId: number): Promise<{ pendingSum: number, completedSum: number }>;
}

export const IWithdrawalRepository = Symbol('IWithdrawalRepository');
