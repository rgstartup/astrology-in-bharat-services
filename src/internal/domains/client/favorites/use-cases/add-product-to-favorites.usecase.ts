import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientFavorites } from '@/core/drizzledb/schema';
import { FavoriteItemType } from '../enum';

@Injectable()
export class AddProductToFavoritesUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, productId: number) {
    const [existingFavorite] = await this.db
      .select()
      .from(clientFavorites)
      .where(
        and(
          eq(clientFavorites.client_id, clientId),
          eq(clientFavorites.item_id, productId),
          eq(clientFavorites.item_type, FavoriteItemType.PRODUCT),
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
        item_id: productId,
        item_type: FavoriteItemType.PRODUCT,
      })
      .returning();

    return favorite;
  }
}
