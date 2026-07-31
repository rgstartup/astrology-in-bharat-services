import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionPurpose,
} from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';

interface EarningsRawResult {
  chat_total: string | null;
  call_total: string | null;
  video_total: string | null;
  product_total: string | null;
  puja_total: string | null;
}

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

    // Let's refine the query since we need to distinguish chat, call, video, product, puja.
    // In our system:
    // Chat = reference_id LIKE 'chat_%'
    // Call = reference_id LIKE 'call_%' (audio)
    // Video = reference_id LIKE 'video_%' OR reference_id LIKE 'call_%' with video type
    // Product = reference_id LIKE 'order_%' OR purpose = PRODUCT_PURCHASE
    // Puja = reference_id LIKE 'puja_%' OR purpose = PUJA_CONFIRMATION

    // Better query using reference_id and purpose:
    const preciseResult = (await this.transactionRepository
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
      .getRawOne()) as EarningsRawResult | null;

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
