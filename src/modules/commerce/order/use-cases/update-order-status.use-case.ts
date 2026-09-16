import { Injectable } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';
import { IUser } from '@/common/types/access-token.payload';
import { OrderService } from '../services/order.service';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(private readonly orderService: OrderService) {}

  async execute(
    id: number,
    status: OrderStatus,
    cancellationReason?: string,
    merchantId?: number,
    user?: IUser,
  ) {
    return this.orderService.updateOrderStatus(
      id,
      status,
      cancellationReason,
      merchantId,
      user,
    );
  }
}
