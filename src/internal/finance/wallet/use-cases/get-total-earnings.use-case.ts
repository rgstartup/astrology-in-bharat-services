import { Injectable, Inject } from '@nestjs/common';
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { transactions } from '@/core/drizzledb/schema';
import { GetWalletUseCase } from './get-wallet.use-case';
import { TransactionType, TransactionPurpose } from '../enum';
import { WalletKey } from '../entities/wallet.entity';

@Injectable()
export class GetTotalEarningsUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  async execute(
    profileId: number,
    walletKey: WalletKey,
    options: { startDate?: Date; endDate?: Date } = {},
  ): Promise<number> {
    const wallet = await this.getWalletUseCase.execute(profileId, walletKey);

    const conditions = [
      eq(transactions.wallet_id, wallet.id),
      eq(transactions.type, TransactionType.CREDIT),
      inArray(transactions.purpose, [
        TransactionPurpose.CONSULTATION,
        TransactionPurpose.PRODUCT_PURCHASE,
        TransactionPurpose.AGENT_COMMISSION,
        TransactionPurpose.PUJA_CONFIRMATION,
      ]),
    ];

    if (options.startDate) {
      conditions.push(gte(transactions.created_at, options.startDate));
    }

    if (options.endDate) {
      conditions.push(lte(transactions.created_at, options.endDate));
    }

    const result = await this.db
      .select({ sum: sql<string>`coalesce(sum(${transactions.amount}), '0')` })
      .from(transactions)
      .where(and(...conditions));

    return Number(result[0]?.sum) || 0;
  }
}
