import { BankAccount } from '../entities/bank-account.entity';

export interface IBankAccountRepository {
    findByExpertId(expertId: number): Promise<BankAccount[]>;
    findById(id: number): Promise<BankAccount | null>;
    save(bankAccount: BankAccount): Promise<BankAccount>;
    create(data: Partial<BankAccount>): BankAccount;
    remove(bankAccount: BankAccount): Promise<BankAccount>;
    findPrimary(expertId: number): Promise<BankAccount | null>;
    countByExpertId(expertId: number): Promise<number>;
    resetPrimaryStatus(expertId: number): Promise<void>;
}

export const IBankAccountRepository = Symbol('IBankAccountRepository');
