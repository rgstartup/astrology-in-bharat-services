import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { orders } from '@/core/drizzledb/schema';
import type { Order } from '@/internal/commerce/order/entities/order.entity';

@Injectable()
export class GetOrderByIdUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number, profileId: number) {
    const order = await this.db.query.orders.findFirst({
      where: and(
        eq(orders.id, Number(id)),
        eq(orders.client_id, Number(profileId)),
      ),
      with: {
        items: { with: { product: true } },
        client: { with: { user: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order as unknown as Order;
  }
}
