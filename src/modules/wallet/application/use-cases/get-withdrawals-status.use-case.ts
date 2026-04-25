import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../../infrastructure/persistence/entities/withdrawal.entity';

@Injectable()
export class GetWithdrawalsStatusUseCase {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
  ) { }

  async execute(userId: number) {
    const query = this.withdrawalRepository
      .createQueryBuilder('w')
      .where('w.user_id = :userId', { userId });

    const pendingResult = await query
      .clone()
      .andWhere('w.status = :status', { status: 'pending' })
      .select('SUM(w.amount)', 'sum')
      .getRawOne();

    const approvedResult = await query
      .clone()
      .andWhere('w.status = :status', { status: 'approved' })
      .select('SUM(w.amount)', 'sum')
      .getRawOne();

    const processingResult = await query
      .clone()
      .andWhere('w.status = :status', { status: 'processing' })
      .select('SUM(w.amount)', 'sum')
      .getRawOne();

    const totalWithdrawnResult = await query
      .clone()
      .andWhere('w.status IN (:...status)', { status: ['completed', 'success'] })
      .select('SUM(w.amount)', 'sum')
      .getRawOne();

    return {
      pendingAmount: Number(pendingResult.sum || 0),
      approvedAmount: Number(approvedResult.sum || 0),
      processingAmount: Number(processingResult.sum || 0),
      totalWithdrawn: Number(totalWithdrawnResult.sum || 0),
      // For backward compatibility
      pendingWithdrawals: Number(pendingResult.sum || 0) + Number(approvedResult.sum || 0) + Number(processingResult.sum || 0),
    };
  }

}
