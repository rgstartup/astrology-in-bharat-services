import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { cartItems, carts } from '@/core/drizzledb/schema';
import { UpdateCartItemDto } from '../dto/update-cart.dto';

@Injectable()
export class UpdateCartItemUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    clientId: number | string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const { productId, quantity } = updateCartItemDto;

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

    if (quantity <= 0) {
      await this.db.delete(cartItems).where(eq(cartItems.id, cartItem.id));
      return cartItem;
    }

    const [updated] = await this.db
      .update(cartItems)
      .set({ quantity, updated_at: new Date() })
      .where(eq(cartItems.id, cartItem.id))
      .returning();

    return updated;
  }
}
