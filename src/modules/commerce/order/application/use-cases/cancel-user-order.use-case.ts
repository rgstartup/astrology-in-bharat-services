import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/entities/order.entity';
import { UpdateOrderStatusUseCase } from './update-order-status.use-case';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class CancelUserOrderUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private updateOrderStatusUseCase: UpdateOrderStatusUseCase,
  ) {}

  async execute(
    orderId: string,
    profileId: string,
    cancellationReason: string,
    user: IUser,
  ) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, client_id: profileId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found or you do not have permission to access it');
    }

    const cancelableStatuses = [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING];
    if (!cancelableStatuses.includes(order.status)) {
      throw new ForbiddenException(`Oops! This order cannot be cancelled because it is currently in '${order.status}' status.`);
    }

    const allInvalid = order.items.every(
      (item) =>
        item.status === OrderStatus.DELIVERED ||
        item.status === OrderStatus.CANCELLED ||
        item.status === OrderStatus.SHIPPED,
    );

    if (allInvalid) {
      throw new ForbiddenException(`This order cannot be cancelled as all items have already been shipped, delivered, or cancelled.`);
    }

    // Proceed to cancel using the main update status use case
    return this.updateOrderStatusUseCase.execute(
      orderId,
      OrderStatus.CANCELLED,
      cancellationReason,
      undefined,
      user,
    );
  }
}
