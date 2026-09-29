import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import { clientFavorites } from '../../../../../core/drizzledb/schema';
import { FavoriteItemType } from '../enum';

@Injectable()
export class AddExpertToFavoritesUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, expertId: number) {
    const [existingFavorite] = await this.db
      .select()
      .from(clientFavorites)
      .where(
        and(
          eq(clientFavorites.client_id, clientId),
          eq(clientFavorites.item_id, expertId),
          eq(clientFavorites.item_type, FavoriteItemType.EXPERT),
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
        item_id: expertId,
        item_type: FavoriteItemType.EXPERT,
      })
      .returning();

    return favorite;
  }
}
