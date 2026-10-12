import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientFavorites } from '@/core/drizzledb/schema';
import { FavoriteItemType } from '../enum';

@Injectable()
export class RemoveExpertFromFavoritesUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, expertId: number) {
    const deleted = await this.db
      .delete(clientFavorites)
      .where(
        and(
          eq(clientFavorites.client_id, clientId),
          eq(clientFavorites.item_id, expertId),
          eq(clientFavorites.item_type, FavoriteItemType.EXPERT),
        ),
      )
      .returning();

    return { affected: deleted.length };
  }
}
