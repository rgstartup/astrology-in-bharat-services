import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal, WithdrawalStatus } from '../../infrastructure/persistence/entities/withdrawal.entity';

@Injectable()
export class GetPendingWithdrawalsUseCase {
    constructor(
        @InjectRepository(Withdrawal)
        private readonly withdrawalRepository: Repository<Withdrawal>,
    ) { }

    async execute(page = 1, limit = 10) {
        const [items, total] = await this.withdrawalRepository.findAndCount({
            where: { status: WithdrawalStatus.PENDING },
            relations: ['user', 'bankAccount'],
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items: items.map(item => ({
                id: item.id,
                amount: Number(item.amount),
                status: item.status,
                date: item.created_at,
                expertName: item.user?.name || 'Unknown',
                bankAccount: item.bankAccount ? {
                    bankName: item.bankAccount.bank_name,
                    accountNumber: item.bankAccount.account_number,
                    ifsc: item.bankAccount.ifsc_code,
                } : null,
            })),
            total,
            page,
            limit,
        };
    }
}
