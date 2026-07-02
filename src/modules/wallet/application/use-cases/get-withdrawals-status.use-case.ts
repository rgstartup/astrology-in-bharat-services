import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../../infrastructure/entities/withdrawal.entity';
import { GetWalletUseCase } from './get-wallet.use-case';
import { WalletKey } from '../../infrastructure/entities/wallet.entity';

@Injectable()
export class GetWithdrawalsStatusUseCase {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  async execute(profileId: string, walletKey: WalletKey) {
    const wallet = await this.getWalletUseCase.execute(profileId, walletKey);
    let ownerKey = '';
    let ownerId = '';

    if (wallet.expert_id) {
      ownerKey = 'expert_id';
      ownerId = wallet.expert_id;
    } else if (wallet.merchant_id) {
      ownerKey = 'merchant_id';
      ownerId = wallet.merchant_id;
    } else if (wallet.agent_id) {
      ownerKey = 'agent_profile_id';
      ownerId = wallet.agent_id;
    }

    const query = this.withdrawalRepository.createQueryBuilder('w');

    if (ownerKey) {
      query.where(`w.${ownerKey} = :ownerId`, { ownerId });
    } else {
      query.where('1 = 0');
    }

    const pendingResult: { sum: string | null } | undefined = await query
      .clone()
      .andWhere('w.status = :status', { status: 'pending' })
      .select('SUM(w.amount)', 'sum')
      .getRawOne();

    const approvedResult: { sum: string | null } | undefined = await query
      .clone()
      .andWhere('w.status = :status', { status: 'approved' })
      .select('SUM(w.amount)', 'sum')
      .getRawOne();

    const processingResult: { sum: string | null } | undefined = await query
      .clone()
      .andWhere('w.status = :status', { status: 'processing' })
      .select('SUM(w.amount)', 'sum')
      .getRawOne();

    const totalWithdrawnResult: { sum: string | null } | undefined = await query
      .clone()
      .andWhere('w.status IN (:...status)', {
        status: ['completed', 'success'],
      })
      .select('SUM(w.amount)', 'sum')
      .getRawOne();

    return {
      pending_amount: Number(pendingResult?.sum || 0),
      approved_amount: Number(approvedResult?.sum || 0),
      processing_amount: Number(processingResult?.sum || 0),
      total_withdrawn: Number(totalWithdrawnResult?.sum || 0),
      // For backward compatibility
      pending_withdrawals:
        Number(pendingResult?.sum || 0) +
        Number(approvedResult?.sum || 0) +
        Number(processingResult?.sum || 0),
    };
  }
}
