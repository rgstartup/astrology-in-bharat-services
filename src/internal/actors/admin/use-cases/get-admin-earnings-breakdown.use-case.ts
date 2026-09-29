import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../finance/wallet/entities/transaction.entity';
import { TransactionPurpose } from '../../finance/wallet/enum';

@Injectable()
export class GetAdminEarningsBreakdownUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(days: number = 7) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    dateLimit.setHours(0, 0, 0, 0);

    // Query using reference_id and purpose:
    const preciseResult = await this.transactionRepository
      .createQueryBuilder('t')
      .select([
        `SUM(t.amount) FILTER (WHERE t.reference_id LIKE 'chat_%') AS chat_total`,
        `SUM(t.amount) FILTER (WHERE t.reference_id LIKE 'call_%') AS call_total`,
        `SUM(t.amount) FILTER (WHERE t.reference_id LIKE 'video_%') AS video_total`,
        `SUM(t.amount) FILTER (WHERE t.reference_id LIKE 'order_%' OR t.purpose = :productPurpose) AS product_total`,
        `SUM(t.amount) FILTER (WHERE t.reference_id LIKE 'puja_%' OR t.purpose = :pujaPurpose) AS puja_total`,
      ])
      .where('t.created_at >= :dateLimit', { dateLimit })
      .setParameters({
        productPurpose: TransactionPurpose.PRODUCT_PURCHASE,
        pujaPurpose: TransactionPurpose.PUJA_CONFIRMATION,
      })
      .getRawOne();

    return [
      {
        name: 'Chat',
        value: Number(preciseResult?.chat_total || 0),
        color: '#f97316',
      },
      {
        name: 'Call',
        value: Number(preciseResult?.call_total || 0),
        color: '#3b82f6',
      },
      {
        name: 'Video Call',
        value: Number(preciseResult?.video_total || 0),
        color: '#ec4899',
      },
      {
        name: 'Product Selling',
        value: Number(preciseResult?.product_total || 0),
        color: '#10b981',
      },
      {
        name: 'Puja Service',
        value: Number(preciseResult?.puja_total || 0),
        color: '#8b5cf6',
      },
    ];
  }
}
