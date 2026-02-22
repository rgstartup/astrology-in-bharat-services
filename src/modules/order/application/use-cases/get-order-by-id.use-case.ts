import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../infrastructure/persistence/entities/order.entity';

@Injectable()
export class GetOrderByIdUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async execute(id: number, userId: number) {
    const order = await this.orderRepo.findOne({
      where: { id, userId },
      relations: ['items', 'items.product'],
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
