import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../../infrastructure/entities/withdrawal.entity';

@Injectable()
export class GetWithdrawalsUseCase {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
  ) { }

  async execute(userId: string, limit: number = 50, offset: number = 0) {
    const [items, total] = await this.withdrawalRepository.findAndCount({
      where: { wallet: { client_id: userId as any } } as any,
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
