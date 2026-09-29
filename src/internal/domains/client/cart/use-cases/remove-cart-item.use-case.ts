import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import { cartItems, carts } from '../../../../../core/drizzledb/schema';

@Injectable()
export class RemoveCartItemUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number | string, productId: number | string) {
    const [row] = await this.db
      .select({ item: cartItems })
      .from(cartItems)
      .innerJoin(carts, eq(cartItems.cart_id, carts.id))
      .where(
        and(
          eq(carts.client_id, Number(clientId)),
          eq(cartItems.product_id, Number(productId)),
        ),
      )
      .limit(1);

    const cartItem = row?.item;

    if (!cartItem) {
      throw new NotFoundException('Item not found in the cart');
    }

    await this.db.delete(cartItems).where(eq(cartItems.id, cartItem.id));

    return cartItem;
  }
}
