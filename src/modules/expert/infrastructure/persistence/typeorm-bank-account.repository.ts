import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../../domain/entities/bank-account.entity';
import { IBankAccountRepository } from '../../domain/repositories/bank-account.repository.interface';

@Injectable()
export class TypeOrmBankAccountRepository implements IBankAccountRepository {
    constructor(
        @InjectRepository(BankAccount)
        private readonly repository: Repository<BankAccount>,
    ) { }

    async findByExpertId(expertId: number): Promise<BankAccount[]> {
        return this.repository.find({ where: { expertId } });
    }

    async findById(id: number): Promise<BankAccount | null> {
        return this.repository.findOne({ where: { id } });
    }

    async save(bankAccount: BankAccount): Promise<BankAccount> {
        return this.repository.save(bankAccount);
    }

    create(data: Partial<BankAccount>): BankAccount {
        return this.repository.create(data);
    }

    async remove(bankAccount: BankAccount): Promise<BankAccount> {
        return this.repository.remove(bankAccount);
    }

    async findPrimary(expertId: number): Promise<BankAccount | null> {
        return this.repository.findOne({ where: { expertId, is_primary: true } });
    }

    async countByExpertId(expertId: number): Promise<number> {
        return this.repository.count({ where: { expertId } });
    }

    async resetPrimaryStatus(expertId: number): Promise<void> {
        await this.repository.update({ expertId }, { is_primary: false });
    }
}
