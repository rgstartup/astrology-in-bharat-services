import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../../infrastructure/entities/withdrawal.entity';
import { GetWalletUseCase } from './get-wallet.use-case';

@Injectable()
export class GetWithdrawalsUseCase {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) { }

  async execute(userId: string, limit: number = 50, offset: number = 0) {
    const wallet = await this.getWalletUseCase.execute(userId);
    let ownerWhere: any = { id: null }; // Default fail if no owner found
    if (wallet.expert_id) ownerWhere = { expert_id: wallet.expert_id };
    else if (wallet.merchant_id) ownerWhere = { merchant_id: wallet.merchant_id };
    else if (wallet.agent_id) ownerWhere = { agent_profile_id: wallet.agent_id };

    const [items, total] = await this.withdrawalRepository.findAndCount({
      where: ownerWhere,
      order: { created_at: 'DESC' },
      skip: offset,
      take: limit,
    });

    console.log(`[GetWithdrawalsUseCase] First item details:`, items.length > 0 ? {
        id: items[0].id,
        withdrawal_no: (items[0] as any).withdrawal_no,
        all_keys: Object.keys(items[0])
    } : 'No items');

    return { 
      data: items, 
      meta: {
        totalCount: total,
        limit,
        offset
      }
    };
  }
}
