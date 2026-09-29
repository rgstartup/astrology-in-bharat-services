import { Inject, Injectable } from '@nestjs/common';
import { and, eq, getTableColumns, ilike, or, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import { clientFavorites, products } from '../../../../../core/drizzledb/schema';
import { FavoriteItemType } from '../enum';
import { FindFavoriteProductsDto } from '../dto/favorite-product.dto';

@Injectable()
export class FindFavoriteProductsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, query?: FindFavoriteProductsDto) {
    const whereConditions: SQL[] = [
      eq(clientFavorites.client_id, clientId),
      eq(clientFavorites.item_type, FavoriteItemType.PRODUCT),
    ];

    if (query?.search) {
      const searchPattern = `%${query.search}%`;
      const searchCondition = or(
        ilike(products.name, searchPattern),
        ilike(products.description, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    let q = this.db
      .select(getTableColumns(products))
      .from(products)
      .innerJoin(clientFavorites, eq(clientFavorites.item_id, products.id))
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
