import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  eq,
  getTableColumns,
  ilike,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientFavorites,
  products,
  productVariants,
} from '@/core/drizzledb/schema';
import { FavoriteItemType } from '../enum';
import { FindFavoriteProductVariantsDto } from '../dto/favorite-product-variant.dto';

@Injectable()
export class FindFavoriteProductVariantsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, query?: FindFavoriteProductVariantsDto) {
    const whereConditions: SQL[] = [
      eq(clientFavorites.client_id, clientId),
      eq(clientFavorites.item_type, FavoriteItemType.PRODUCT_VARIANT),
    ];

    if (query?.search) {
      const searchPattern = `%${query.search}%`;
      const searchCondition = or(
        ilike(productVariants.name, searchPattern),
        ilike(productVariants.sku, searchPattern),
        ilike(productVariants.description, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    let q = this.db
      .select({
        ...getTableColumns(productVariants),
        product: getTableColumns(products),
      })
      .from(productVariants)
      .innerJoin(
        clientFavorites,
        sql`${clientFavorites.item_id} = ${productVariants.id}`,
      )
      .leftJoin(products, sql`${productVariants.product_id} = ${products.id}`)
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
