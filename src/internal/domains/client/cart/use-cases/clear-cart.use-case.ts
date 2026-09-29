import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import { carts } from '../../../../../core/drizzledb/schema';

@Injectable()
export class ClearCartUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number | string): Promise<void> {
    // Item rows cascade from the `cart_items_cart_id` FK, same as the
    // legacy `cartRepo.delete` which relied on DB-level cascade.
    const deleted = await this.db
      .delete(carts)
      .where(eq(carts.client_id, Number(clientId)))
      .returning({ id: carts.id });

    if (deleted.length === 0) {
      throw new NotFoundException('Cart not found');
    }
  }
}
