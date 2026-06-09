import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../infrastructure/entities/order.entity';
import { OrderItem } from '../../infrastructure/entities/order-item.entity';

@Injectable()
export class FindAllOrdersUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,
  ) { }

  async execute() {
    return this.orderRepo.find({
      relations: ['items', 'items.product', 'client', 'client.user'],
      order: { created_at: 'DESC' },
    });
  }

  async getExpertProductRevenueAndCount(expertProfileId: number) {
    // E-commerce products are sold by Merchants, not Experts.
    // Hence, experts always have 0 product revenue.
    return {
      total: 0,
      count: 0,
    };
  }
}
