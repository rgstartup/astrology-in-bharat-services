import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import { clientFavorites } from '../../../../../core/drizzledb/schema';
import { FavoriteItemType } from '../enum';

@Injectable()
export class AddProductVariantToFavoritesUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, variantId: number) {
    const [existingFavorite] = await this.db
      .select()
      .from(clientFavorites)
      .where(
        and(
          eq(clientFavorites.client_id, clientId),
          eq(clientFavorites.item_id, variantId),
          eq(clientFavorites.item_type, FavoriteItemType.PRODUCT_VARIANT),
        ),
      )
      .limit(1);

    if (existingFavorite) {
      return existingFavorite;
    }

    const [favorite] = await this.db
      .insert(clientFavorites)
      .values({
        client_id: clientId,
        item_id: variantId,
        item_type: FavoriteItemType.PRODUCT_VARIANT,
      })
      .returning();

    return favorite;
  }
}
