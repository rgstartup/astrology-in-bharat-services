import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type {
  DrizzleDb,
  DrizzleTx,
} from '../../../../../core/drizzledb/drizzle.types';
import {
  cartItems,
  carts,
  products,
} from '../../../../../core/drizzledb/schema';
import { AddToCartDto } from '../dto/create-cart.dto';

@Injectable()
export class AddToCartUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number | string, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, Number(productId)))
      .limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.db.transaction(async (tx) => {
      const cart = await this.findOrCreateCart(tx, clientId);
      return this.addCartItem(tx, cart.id, product.id, quantity);
    });
  }

  private async findOrCreateCart(tx: DrizzleTx, clientId: number | string) {
    const [existing] = await tx
      .select()
      .from(carts)
      .where(eq(carts.client_id, Number(clientId)))
      .limit(1);

    if (existing) return existing;

    const [created] = await tx
      .insert(carts)
      .values({ client_id: Number(clientId) })
      .returning();

    return created;
  }

  private async addCartItem(
    tx: DrizzleTx,
    cartId: number,
    productId: number,
    quantity: number,
  ) {
    const [existing] = await tx
      .select()
      .from(cartItems)
      .where(
        and(eq(cartItems.cart_id, cartId), eq(cartItems.product_id, productId)),
      )
      .limit(1);

    if (existing) {
      const [updated] = await tx
        .update(cartItems)
        .set({
          quantity: existing.quantity + quantity,
          updated_at: new Date(),
        })
        .where(eq(cartItems.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await tx
      .insert(cartItems)
      .values({ cart_id: cartId, product_id: productId, quantity })
      .returning();

    return created;
  }
}
