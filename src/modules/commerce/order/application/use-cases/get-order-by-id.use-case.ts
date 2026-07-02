import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../infrastructure/entities/order.entity';

@Injectable()
export class GetOrderByIdUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async execute(id: string, profileId: string) {
    const order = await this.orderRepo.findOne({
      where: { id, client_id: profileId },
      relations: ['items', 'items.product', 'client', 'client.user'],
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
