import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../infrastructure/entities/order.entity';

@Injectable()
export class GetOrderEarningsUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async execute(dateLimit: Date): Promise<number> {
    const productStats = (await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total_amount)', 'total')
      .where('order.created_at >= :date', { date: dateLimit })
      .andWhere("order.status IN ('paid', 'packed', 'shipped', 'delivered')")
      .getRawOne<{ total: string | null }>()) ?? { total: null };

    return parseFloat(productStats.total ?? '0') || 0;
  }
}
