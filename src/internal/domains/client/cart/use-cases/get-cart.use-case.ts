import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { carts } from '@/core/drizzledb/schema';
import { toCartDetails } from '../cart.mapper';

@Injectable()
export class GetCartUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number | string) {
    const cart = await this.db.query.carts.findFirst({
      where: eq(carts.client_id, Number(clientId)),
      with: { items: { with: { product: true, variant: true } } },
    });

    if (!cart) {
      return { items: [] };
    }

    return toCartDetails(cart);
  }
}
