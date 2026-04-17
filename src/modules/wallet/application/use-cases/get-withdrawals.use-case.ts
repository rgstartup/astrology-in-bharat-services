import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../../infrastructure/persistence/entities/withdrawal.entity';

@Injectable()
export class GetWithdrawalsUseCase {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
  ) { }

  async execute(userId: number, page: number = 1, limit: number = 50) {
    const [items, total] = await this.withdrawalRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }
}
