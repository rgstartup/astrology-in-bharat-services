import { Inject, Injectable } from '@nestjs/common';
import { and, eq, getTableColumns, ilike, or, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientFavorites, expertAccounts } from '@/core/drizzledb/schema';
import { FavoriteItemType } from '../enum';
import { FindFavoriteExpertsDto } from '../dto/favorite-expert.dto';

@Injectable()
export class FindFavoriteExpertsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, query?: FindFavoriteExpertsDto) {
    const whereConditions: SQL[] = [
      eq(clientFavorites.client_id, clientId),
      eq(clientFavorites.item_type, FavoriteItemType.EXPERT),
    ];

    if (query?.search) {
      const searchPattern = `%${query.search}%`;
      const searchCondition = or(
        ilike(expertAccounts.name, searchPattern),
        ilike(expertAccounts.email, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    let q = this.db
      .select(getTableColumns(expertAccounts))
      .from(expertAccounts)
      .innerJoin(
        clientFavorites,
        eq(clientFavorites.item_id, expertAccounts.id),
      )
      .where(and(...whereConditions));

    if (query?.limit) {
      q = q.limit(query.limit) as typeof q;
    }
    if (query?.offset) {
      q = q.offset(query.offset) as typeof q;
    }

    return await q;
  }
}
