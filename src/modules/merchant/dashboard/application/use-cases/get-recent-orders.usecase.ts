import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '@/modules/commerce/order/infrastructure/entities/order-item.entity';

@Injectable()
export class GetRecentOrdersUseCase {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
  ) {}

  async execute(userId: string) {
    console.log('[RECENT_ORDERS] Request for userId:', userId);
    const recentOrderItems = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoinAndSelect('oi.order', 'o')
      .leftJoinAndSelect('o.user', 'u')
      .innerJoinAndSelect('oi.product', 'p')
      .where('p.merchant_id = :userId', { userId })
      .orderBy('oi.created_at', 'DESC')
      .take(10)
      .getMany();

    return recentOrderItems.map((item) => ({
      id: item.order.id.toString(),
      customerName: item.order.client?.user?.name || 'Guest',
      amount: Number(item.price) * item.quantity,
      status: item.order.status,
      date: item.order.created_at.toISOString(),
      productName: item.product.name,
    }));
  }
}
