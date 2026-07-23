import { Injectable } from '@nestjs/common';
import { OrderStatus } from '../../infrastructure/entities/order.entity';
import { IUser } from '@/common/types/access-token.payload';
import { OrderService } from '../services/order.service';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(private readonly orderService: OrderService) {}

  async execute(
    id: string,
    status: OrderStatus,
    cancellationReason?: string,
    merchantId?: string,
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
