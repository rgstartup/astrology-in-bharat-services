import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { orders } from '@/core/drizzledb/schema';
import { OrderService } from '@/internal/commerce/order/services/order.service';
import type { IUser } from '@/shared/types/access-token.payload';
import { OrderStatus } from '@/internal/commerce/order/enum';
import type { OrderItem } from '@/internal/commerce/order/entities/order-item.entity';

@Injectable()
export class CancelUserOrderUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly orderService: OrderService,
  ) {}

  async execute(
    orderId: number | string,
    profileId: number | string,
    cancellationReason: string,
    user: IUser,
  ) {
    const order = await this.db.query.orders.findFirst({
      where: and(
        eq(orders.id, Number(orderId)),
        eq(orders.client_id, Number(profileId)),
      ),
      with: { items: true },
    });

    if (!order) {
      throw new NotFoundException(
        'Order not found or you do not have permission to access it',
      );
    }

    const cancelableStatuses = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
    ];
    if (!cancelableStatuses.includes(order.status)) {
      throw new ForbiddenException(
        `Oops! This order cannot be cancelled because it is currently in '${order.status}' status.`,
      );
    }

    // Legacy `OrderItem.status` is typed `OrderItemStatus | OrderStatus | string`;
    // widen the Drizzle-narrowed rows to the same contract for the guards below.
    const items = order.items as unknown as OrderItem[];
    const allInvalid = items.every(
      (item) =>
        item.status === OrderStatus.DELIVERED ||
        item.status === OrderStatus.CANCELLED ||
        item.status === OrderStatus.SHIPPED,
    );

    if (allInvalid) {
      throw new ForbiddenException(
        `This order cannot be cancelled as all items have already been shipped, delivered, or cancelled.`,
      );
    }

    // Proceed to cancel using the order service
    return this.orderService.updateOrderStatus(
      orderId,
      OrderStatus.CANCELLED,
      cancellationReason,
      undefined,
      user,
    );
  }
}
