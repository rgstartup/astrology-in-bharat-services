import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionPurpose,
  TransactionType,
} from '../../infrastructure/entities/transaction.entity';
import { Withdrawal } from '../../infrastructure/entities/withdrawal.entity';
import { GetWalletUseCase } from './get-wallet.use-case';
import { WalletKey } from '../../infrastructure/entities/wallet.entity';

@Injectable()
export class GetTransactionsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  async execute(
    profileId: string,
    walletKey: WalletKey,
    limit = 10,
    offset = 0,
    type = 'all',
    purpose?: string,
  ) {
    const wallet = await this.getWalletUseCase.execute(profileId, walletKey);
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
    const transactionsWithBankAccounts = await Promise.all(
      items.map(async (tx) => {
        let bank_account: string | null = null;
        let status = 'success'; // Default
        let remark: string | null = null;

        if (tx.purpose === TransactionPurpose.WITHDRAWAL) {
          const withdrawalWhere: Record<string, unknown> = {
            amount: tx.amount,
          };
          if (wallet.expert_id) withdrawalWhere.expert_id = wallet.expert_id;
          else if (wallet.merchant_id)
            withdrawalWhere.merchant_id = wallet.merchant_id;
          else if (wallet.agent_id)
            withdrawalWhere.agent_profile_id = wallet.agent_id;
          // withdrawals aren't typically for clients, but if so:
          // else return normal

          if (Object.keys(withdrawalWhere).length > 1) {
            const withdrawal = await this.transactionRepository.manager.findOne(
              Withdrawal,
              {
                where: withdrawalWhere,
                order: { created_at: 'DESC' },
              },
            );

            if (withdrawal) {
              bank_account = withdrawal.bank_account_id as string;
              status = withdrawal.status;
              remark = withdrawal.remark || null;
            }
          }
        }

        let description =
          tx.purpose.charAt(0).toUpperCase() +
          tx.purpose.slice(1).replace(/_/g, ' ');

        if (tx.purpose === TransactionPurpose.CONSULTATION) {
          if (tx.type === TransactionType.HOLD)
            description = 'Consultation (Reserved)';
          else if (tx.type === TransactionType.DEBIT)
            description = 'Consultation (Completed)';
          else if (tx.type === TransactionType.RELEASE)
            description = 'Consultation (Refunded)';
        } else if (tx.purpose === TransactionPurpose.PUJA_CONFIRMATION) {
          description = 'Puja Ritual Confirmation';
          if (tx.reference_id && tx.reference_id.startsWith('puja_appt_')) {
            const apptId = tx.reference_id.replace('puja_appt_', '');
            try {
              const { PujaAppointment } = await import(
                '@/modules/puja-appointment/infrastructure/entities/puja-appointment.entity'
              );
              const appt = await this.transactionRepository.manager.findOne(
                PujaAppointment as unknown as import('typeorm').EntityTarget<
                  import('typeorm').ObjectLiteral
                >,
                {
                  where: { id: apptId },
                  relations: ['puja'],
                },
              );
              if (appt && (appt as Record<string, unknown>).puja) {
                description = `Puja Ritual: ${((appt as Record<string, unknown>).puja as Record<string, unknown>).name as string}`;
              }
            } catch (e) {
              console.warn('Could not fetch puja details', e);
            }
          }
        } else if (tx.purpose === TransactionPurpose.REFUND) {
          description = 'Refund Issued';
          if (tx.reference_id) {
            const regex = /^(chat|call|video)_([a-f0-9\-]{36})$/i;
            const match = tx.reference_id.match(regex);
            if (match) {
              const typeStr = match[1].toLowerCase();
              const uuid = match[2];
              const typeLabel = typeStr === 'chat' ? 'CHAT' : typeStr === 'video' ? 'VID' : 'CALL';
              const lastPart = uuid.split('-').pop() || '';
              const formattedId = `AIB-${typeLabel}-${lastPart.slice(-6).toUpperCase()}`;
              description = `Refund (${formattedId})`;
            } else {
              description = `Refund (#${tx.reference_id})`;
            }
          }
        } else if (tx.purpose === TransactionPurpose.WITHDRAWAL) {
          description = 'Payout Request';
          if (status === 'rejected') description = 'Payout Rejected';
          else if (status === 'success' || status === 'completed')
            description = 'Payout Completed';
        }

        let formatted_transaction_no = tx.transaction_no;
        if (formatted_transaction_no && formatted_transaction_no.startsWith('AIB-USR-RECH-')) {
          const parts = formatted_transaction_no.split('-');
          if (parts.length >= 6) {
            const lastPart = parts[parts.length - 1];
            formatted_transaction_no = `AIB-RECH-${lastPart.slice(-6).toUpperCase()}`;
          }
        }

        return {
          ...tx,
          transaction_no: formatted_transaction_no,
          bank_account,
          status,
          remark,
          description,
        };
      }),
    );

    return {
      data: transactionsWithBankAccounts,
      meta: {
        totalCount: total,
        limit,
        offset,
      },
    };
  }
}
