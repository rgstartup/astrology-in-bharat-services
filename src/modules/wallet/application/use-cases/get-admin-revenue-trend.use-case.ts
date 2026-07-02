import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@/modules/wallet/infrastructure/entities/transaction.entity';

@Injectable()
export class GetAdminRevenueTrendUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(days: number = 7) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const stats: Array<{
      date: string;
      consultation: string;
      product: string;
      puja: string;
    }> = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('DATE(tx.created_at)', 'date')
      .addSelect(
        "SUM(CASE WHEN tx.purpose = 'consultation' THEN tx.amount ELSE 0 END)",
        'consultation',
      )
      .addSelect(
        "SUM(CASE WHEN tx.purpose = 'product_purchase' THEN tx.amount ELSE 0 END)",
        'product',
      )
      .addSelect(
        "SUM(CASE WHEN tx.purpose = 'puja_confirmation' THEN tx.amount ELSE 0 END)",
        'puja',
      )
      .where('tx.created_at >= :date', { date: dateLimit })
      .andWhere("tx.type = 'debit'") // Summing actual user spending (debits)
      .groupBy('DATE(tx.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return stats.map((s) => ({
      date: s.date,
      consultation: parseFloat(s.consultation) || 0,
      product: parseFloat(s.product) || 0,
      puja: parseFloat(s.puja) || 0,
    }));
  }
}
