import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/persistence/entities/order.entity';

@Injectable()
export class MarkOrderAsPaidUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async execute(razorpayOrderId: string) {
    const order = await this.orderRepo.findOne({
      where: { razorpayOrderId },
    });

    if (!order) {
      return;
    }

    order.status = OrderStatus.PAID;
    await this.orderRepo.save(order);
  }
}
