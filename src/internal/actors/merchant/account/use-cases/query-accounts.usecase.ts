import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, ilike, or, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  merchantAccounts,
  type MerchantAccountRow,
} from '@/core/drizzledb/schema';
import type { MerchantAccount } from '../entities/account.entity';
import type { QueryMerchantDto } from '../dto/request/query-merchant.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';
import { MerchantAccountResponseDto } from '../dto/response/merchant-account-response.dto';
import { toMerchantAccountResponse } from '../account.mapper';

@Injectable()
export class QueryMerchantAccountsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list(query: QueryMerchantDto) {
    const conditions: SQL[] = [];

    if (query?.q) {
      const searchPattern = `%${query.q}%`;
      conditions.push(
        or(
          ilike(merchantAccounts.name, searchPattern),
          ilike(merchantAccounts.shop_name, searchPattern),
          ilike(merchantAccounts.city, searchPattern),
        )!,
      );
    }

    if (query?.city) {
      conditions.push(ilike(merchantAccounts.city, `%${query.city}%`));
    }

    if (query?.status) {
      conditions.push(eq(merchantAccounts.status, query.status));
    }

    if (query?.is_online === 'true') {
      conditions.push(eq(merchantAccounts.is_online, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, [{ value: totalCount }]] = await Promise.all([
      this.db
        .select()
        .from(merchantAccounts)
        .where(whereClause)
        .offset(query.offset)
        .limit(query.limit),
      this.db
        .select({ value: count() })
        .from(merchantAccounts)
        .where(whereClause),
    ]);

    const mapped = (data as MerchantAccountRow[]).map(
      (item: MerchantAccountRow) =>
        MerchantAccountResponseDto.from(toMerchantAccountResponse(item)),
    );

    return new PaginatedResponseDto(
      mapped,
      Number(totalCount),
      query.page,
      query.limit,
    );
  }

  async byId(id: number): Promise<MerchantAccountResponseDto> {
    const [account] = await this.db
      .select()
      .from(merchantAccounts)
      .where(eq(merchantAccounts.id, id))
      .limit(1);

    if (!account) {
      throw new NotFoundException('Merchant account not found');
    }

    return MerchantAccountResponseDto.from(
      toMerchantAccountResponse(account as MerchantAccountRow),
    );
  }

  async findEntityById(id: number): Promise<MerchantAccount | null> {
    const [account] = await this.db
      .select()
      .from(merchantAccounts)
      .where(eq(merchantAccounts.id, id))
      .limit(1);

    return account
      ? (toMerchantAccountResponse(
          account as MerchantAccountRow,
        ) as unknown as MerchantAccount)
      : null;
  }

  async byUserId(userId: number): Promise<MerchantAccount | null> {
    const [account] = await this.db
      .select()
      .from(merchantAccounts)
      .where(eq(merchantAccounts.user_id, userId))
      .limit(1);

    return account
      ? (toMerchantAccountResponse(
          account as MerchantAccountRow,
        ) as unknown as MerchantAccount)
      : null;
  }

  async getRaw(): Promise<MerchantAccount[]> {
    const accounts = await this.db.select().from(merchantAccounts);
    return (accounts as MerchantAccountRow[]).map(
      (a: MerchantAccountRow) =>
        toMerchantAccountResponse(a) as unknown as MerchantAccount,
    );
  }
}
