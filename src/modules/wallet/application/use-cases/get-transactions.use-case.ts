import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../infrastructure/entities/transaction.entity';
import { Withdrawal } from '../../infrastructure/entities/withdrawal.entity';
import { GetWalletUseCase } from './get-wallet.use-case';

@Injectable()
export class GetTransactionsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) { }

  async execute(
    userId: string,
    limit = 10,
    offset = 0,
    type = 'all',
    purpose?: string,
  ) {
    const wallet = await this.getWalletUseCase.execute(userId);
    const query = this.transactionRepository
      .createQueryBuilder('t')
      .where('t.wallet_id = :walletId', { walletId: wallet.id });

    if (type !== 'all') {
      query.andWhere('t.type = :type', { type });
    }

    if (purpose) {
      query.andWhere('t.purpose = :purpose', { purpose });
    }

    const [items, total] = await query
      .orderBy('t.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    // Map withdrawals for the bank account ID
    const transactionsWithBankAccounts = await Promise.all(items.map(async (tx) => {
      let bank_account: string | null = null;
      let status = 'success'; // Default
      let remark: string | null = null;

      if (tx.purpose === 'withdrawal') {
        let withdrawalWhere: any = { amount: tx.amount };
        if (wallet.expert_id) withdrawalWhere.expert_id = wallet.expert_id;
        else if (wallet.merchant_id) withdrawalWhere.merchant_id = wallet.merchant_id;
        else if (wallet.agent_id) withdrawalWhere.agent_profile_id = wallet.agent_id;
        // withdrawals aren't typically for clients, but if so:
        // else return normal
        
        if (Object.keys(withdrawalWhere).length > 1) {
            const withdrawal = await this.transactionRepository.manager.findOne(Withdrawal, {
              where: withdrawalWhere,
              order: { created_at: 'DESC' },
            });

            if (withdrawal) {
              bank_account = withdrawal.bank_account_id as string;
              status = withdrawal.status;
              remark = withdrawal.remark || null;
            }
        }
      }

      let description = tx.purpose.charAt(0).toUpperCase() + tx.purpose.slice(1).replace(/_/g, ' ');
      
      if (tx.purpose === 'consultation') {
        if (tx.type === 'hold') description = 'Consultation (Reserved)';
        else if (tx.type === 'debit') description = 'Consultation (Completed)';
        else if (tx.type === 'release') description = 'Consultation (Refunded)';
      } else if (tx.purpose === 'puja_confirmation') {
        description = 'Puja Ritual Confirmation';
        if (tx.reference_id && tx.reference_id.startsWith('puja_appt_')) {
            const apptId = tx.reference_id.replace('puja_appt_', '');
            try {
                const { PujaAppointment } = await import('../../../puja-appointment/infrastructure/entities/puja-appointment.entity');
                const appt = await this.transactionRepository.manager.findOne(PujaAppointment as any, {
                    where: { id: apptId },
                    relations: ['puja']
                });
                if (appt && (appt as any).puja) {
                    description = `Puja Ritual: ${(appt as any).puja.name}`;
                }
            } catch (e) {
                console.warn('Could not fetch puja details', e);
            }
        }
      } else if (tx.purpose === 'refund') {
        description = 'Refund Issued';
        if (tx.reference_id) description = `Refund (#${tx.reference_id})`;
      } else if (tx.purpose === 'withdrawal') {
        description = 'Payout Request';
        if (status === 'rejected') description = 'Payout Rejected';
        else if (status === 'success' || status === 'completed') description = 'Payout Completed';
      }

      return {
        ...tx,
        bank_account,
        status,
        remark,
        description,
      };

    }));

    return { 
      data: transactionsWithBankAccounts, 
      meta: {
        totalCount: total,
        limit,
        offset
      }
    };
  }
}
