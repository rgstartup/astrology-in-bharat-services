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

    async execute(limit = 10, offset = 0, status?: string, userRole?: string) {
        const query = this.withdrawalRepository.createQueryBuilder('w')
            .leftJoinAndSelect('w.user', 'user')
            .leftJoinAndSelect('w.bankAccount', 'bankAccount')
            .orderBy('w.created_at', 'DESC')
            .skip(offset)
            .take(limit);

        if (status && status !== 'all') {
            query.andWhere('w.status = :status', { status });
        } else if (!status) {
            query.andWhere('w.status = :status', { status: WithdrawalStatus.PENDING });
        }

        query.leftJoinAndSelect('user.roles', 'role');

        if (userRole && userRole !== 'all') {
            console.log(`[GetPendingWithdrawals] Filtering by role: ${userRole}`);
            query.andWhere('LOWER(role.name) = LOWER(:roleName)', { roleName: userRole });
        }

        const [items, total] = await query.getManyAndCount();
        console.log(`[GetPendingWithdrawals] Found ${items.length} items. First item withdrawal_no:`, items.length > 0 ? items[0].withdrawal_no : 'N/A');





        return {
            data: items.map(item => ({
                id: item.id,
                amount: Number(item.amount),
                status: item.status,
                remark: item.remark,
                date: item.created_at,
                userName: item.user?.name || 'Unknown',
                withdrawalNo: item.withdrawal_no,


                bankAccount: item.bankAccount ? {
                    bankName: item.bankAccount.bank_name,
                    accountNumber: item.bankAccount.account_number,
                    ifsc: item.bankAccount.ifsc_code,
                } : (item.merchant_bank_name ? {
                    bankName: item.merchant_bank_name,
                    accountNumber: item.merchant_account_number,
                    ifsc: item.merchant_ifsc,
                } : null),

            })),
            meta: {
                totalCount: total,
                limit,
                offset
            }
        };
    }
}
