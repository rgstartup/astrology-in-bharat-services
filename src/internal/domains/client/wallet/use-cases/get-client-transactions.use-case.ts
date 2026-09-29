import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientTransactions, clientWallets } from '@/core/drizzledb/schema';
import { GetClientTransactionsDto } from '../dto/get-client-transactions.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';
import { toClientTransactionResponse } from '../wallet.mapper';

@Injectable()
export class GetClientTransactionsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, dto: GetClientTransactionsDto) {
    const { limit, page, offset, type, purpose } = dto;

    const whereConditions: SQL[] = [
      eq(clientWallets.client_id, Number(clientId)),
    ];

    if (type) {
      whereConditions.push(eq(clientTransactions.type, type));
    }

    if (purpose) {
      whereConditions.push(eq(clientTransactions.purpose, purpose));
    }

    const rows = await this.db
      .select({
        id: clientTransactions.id,
        wallet_id: clientTransactions.wallet_id,
        amount: clientTransactions.amount,
        balance_before: clientTransactions.balance_before,
        balance_after: clientTransactions.balance_after,
        type: clientTransactions.type,
        purpose: clientTransactions.purpose,
        reference_id: clientTransactions.reference_id,
        reference_type: clientTransactions.reference_type,
        transaction_no: clientTransactions.transaction_no,
        metadata: clientTransactions.metadata,
        created_at: clientTransactions.created_at,
      })
      .from(clientTransactions)
      .innerJoin(
        clientWallets,
        eq(clientTransactions.wallet_id, clientWallets.id),
      )
      .where(and(...whereConditions))
      .orderBy(desc(clientTransactions.created_at))
      .limit(limit)
      .offset(offset);

    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(clientTransactions)
      .innerJoin(
        clientWallets,
        eq(clientTransactions.wallet_id, clientWallets.id),
      )
      .where(and(...whereConditions));

    const items = rows.map(toClientTransactionResponse);

    return PaginatedResponseDto.create(items, total, page, limit);
  }
}
