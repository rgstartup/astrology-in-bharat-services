import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../../infrastructure/entities/withdrawal.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class GetPendingWithdrawalsUseCase {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
  ) {}

  async execute(
    limit = 10,
    offset = 0,
    status?: WithdrawalStatus,
    userRole?: RoleEnum,
  ) {
    const query = this.withdrawalRepository
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.expert', 'expert')
      .leftJoinAndSelect('expert.user', 'expertUser')
      .leftJoinAndSelect('w.merchant', 'merchant')
      .leftJoinAndSelect('merchant.user', 'merchantUser')
      .leftJoinAndSelect('w.agent', 'agent')
      .leftJoinAndSelect('agent.user', 'agentUser')
      .leftJoinAndSelect('w.bankAccount', 'bankAccount')
      .orderBy('w.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    query.andWhere('w.status = :status', {
      status: status ?? WithdrawalStatus.PENDING,
    });

    if (userRole) {
      console.log(`[GetPendingWithdrawals] Filtering by role: ${userRole}`);
      // Filter handled at application level or by joining relevant profile table
    }

    const [items, total] = await query.getManyAndCount();
    console.log(
      `[GetPendingWithdrawals] Found ${items.length} items. First item withdrawal_no:`,
      items.length > 0 ? items[0].withdrawal_no : 'N/A',
    );

    return {
      data: items.map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        status: item.status,
        remark: item.remark,
        date: item.created_at,
        userName:
          item.expert?.user?.name ||
          item.merchant?.user?.name ||
          item.agent?.user?.name ||
          'Unknown',
        withdrawalNo: item.withdrawal_no,
        bankAccount: item.bankAccount
          ? {
              bankName: item.bankAccount.bank_name,
              accountNumber: item.bankAccount.account_number,
              ifsc: item.bankAccount.ifsc_code,
            }
          : item.merchant_bank_name
            ? {
                bankName: item.merchant_bank_name,
                accountNumber: item.merchant_account_number,
                ifsc: item.merchant_ifsc,
              }
            : null,
      })),
      meta: {
        totalCount: total,
        limit,
        offset,
      },
    };
  }
}
