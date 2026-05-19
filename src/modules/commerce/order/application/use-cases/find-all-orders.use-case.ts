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
      relations: ['items', 'items.product', 'user'],
      order: { created_at: 'DESC' },
    });
  }

  async getExpertProductRevenueAndCount(expertProfileId: number) {
    const stats = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.product', 'p')
      .innerJoin('item.order', 'o')
      .select("SUM(item.price * item.quantity)", "total")
      .addSelect("COUNT(item.id)", "count")
      .where('p.expert_id = :id AND o.status IN (:...statuses)', { 
        id: expertProfileId, 
        statuses: ['paid', 'packed', 'shipped', 'delivered'] 
      })
      .getRawOne();
    return {
      total: parseFloat(stats.total) || 0,
      count: parseInt(stats.count, 10) || 0,
    };
  }
}
