import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { IWithdrawalRepository } from '../../domain/repositories/withdrawal.repository.interface';

@Injectable()
export class TypeOrmWithdrawalRepository implements IWithdrawalRepository {
    constructor(
        @InjectRepository(Withdrawal)
        private readonly repository: Repository<Withdrawal>,
    ) { }

    async save(withdrawal: Withdrawal): Promise<Withdrawal> {
        return this.repository.save(withdrawal);
    }

    create(data: Partial<Withdrawal>): Withdrawal {
        return this.repository.create(data);
    }

    async getWithdrawalStats(userId: number): Promise<{ pendingSum: number, completedSum: number }> {
        const query = this.repository
            .createQueryBuilder('w')
            .where('w.userId = :userId', { userId });

        const pendingResult = await query
            .clone()
            .andWhere('w.status IN (:...status)', { status: ['pending', 'processing'] })
            .select('SUM(w.amount)', 'sum')
            .getRawOne();

        const totalWithdrawnResult = await query
            .clone()
            .andWhere('w.status = :status', { status: 'completed' })
            .select('SUM(w.amount)', 'sum')
            .getRawOne();

        return {
            pendingSum: Number(pendingResult.sum || 0),
            completedSum: Number(totalWithdrawnResult.sum || 0),
        };
    }
}
