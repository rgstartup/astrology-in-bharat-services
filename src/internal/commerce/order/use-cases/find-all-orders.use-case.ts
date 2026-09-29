import { Inject, Injectable } from '@nestjs/common';
import { count, desc, inArray } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { orders } from '@/core/drizzledb/schema';
import { OrderStatus } from '@/internal/commerce/order/enum';
import type { Order } from '@/internal/commerce/order/entities/order.entity';

@Injectable()
export class FindAllOrdersUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute() {
    const rows = await this.db.query.orders.findMany({
      orderBy: desc(orders.created_at),
      with: {
        items: { with: { product: true } },
        client: { with: { user: true } },
      },
    });
    return rows as unknown as Order[];
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getExpertProductRevenueAndCount(_expertProfileId: number) {
    // E-commerce products are sold by Merchants, not Experts.
    // Hence, experts always have 0 product revenue.
    return {
      total: 0,
      count: 0,
    };
  }

  async getSuccessfulOrdersCount(): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(orders)
      .where(
        inArray(orders.status, [
          OrderStatus.DELIVERED,
          OrderStatus.PAID,
          OrderStatus.SHIPPED,
          OrderStatus.PROCESSING,
          OrderStatus.PACKED,
        ]),
      );
    return Number(row?.total ?? 0);
  }
}
