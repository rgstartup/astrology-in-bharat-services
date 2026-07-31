import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';

interface RevenueTrendRawRow {
  name: string;
  value: string;
  full_date: string;
}

@Injectable()
export class GetAdminRevenueTrendUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(days: number = 7) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    dateLimit.setHours(0, 0, 0, 0);

    const rawData: RevenueTrendRawRow[] = await this.transactionRepository
      .createQueryBuilder('t')
      .select([
        `TO_CHAR(t.created_at, 'Dy') as name`, // Using short day names (Mon, Tue, etc.) for trend graph
        `SUM(t.amount) as value`,
        `t.created_at::date as full_date`, // For sorting
      ])
      .where('t.created_at >= :dateLimit', { dateLimit })
      .andWhere('t.type = :type', { type: TransactionType.CREDIT }) // Assuming revenue trend only counts credits or specific purpose
      .groupBy(`TO_CHAR(t.created_at, 'Dy')`)
      .addGroupBy(`t.created_at::date`)
      .orderBy(`t.created_at::date`, 'ASC')
      .getRawMany();

    // Fill in missing days with 0 if necessary
    const trendMap = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      trendMap.set(dayName, 0);
    }

    rawData.forEach((row) => {
      trendMap.set(row.name, Number(row.value));
    });

    return Array.from(trendMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }
}
