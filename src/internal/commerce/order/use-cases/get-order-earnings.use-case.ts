import { Inject, Injectable } from '@nestjs/common';
import { and, gte, inArray, sum } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { orders } from '@/core/drizzledb/schema';
import { OrderStatus } from '@/internal/commerce/order/enum';

@Injectable()
export class GetOrderEarningsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(dateLimit: Date): Promise<number> {
    const [row] = await this.db
      .select({ total: sum(orders.total_amount) })
      .from(orders)
      .where(
        and(
          gte(orders.created_at, dateLimit),
          inArray(orders.status, [
            OrderStatus.PAID,
            OrderStatus.PACKED,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
          ]),
        ),
      );

    return parseFloat(row?.total ?? '0') || 0;
  }
}
