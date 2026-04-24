import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/persistence/entities/order.entity';
import { PujaAppointment } from '@/modules/puja-appointment/infrastructure/persistence/entities/puja-appointment.entity';

@Injectable()
export class GetUserOrdersUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(PujaAppointment)
    private pujaRepo: Repository<PujaAppointment>,
  ) { }

  async execute(userId: number, limit?: number, offset?: number) {
    // 1. Fetch Product Orders
    const productOrders = await this.orderRepo.find({
      where: { user_id: userId },
      relations: ['items', 'items.product'],
      order: { created_at: 'DESC' },
    });

    // 2. Fetch Puja Appointments (as Service Orders)
    const pujaOrders = await this.pujaRepo.find({
      where: { user_id: userId },
      relations: ['puja', 'expert', 'expert.user'],
      order: { created_at: 'DESC' },
    });

    // 3. Normalize and Combine
    const normalizedProducts = productOrders.map((o) => ({
      id: o.id,
      trackingId: `ORD-${o.id}`,
      type: 'product',
      name: o.items.length > 0 ? o.items[0].product.name : 'Product Order',
      itemCount: o.items.length,
      amount: Number(o.total_amount),
      status: o.status,
      date: o.created_at,
      paymentMethod: o.payment_method,
      deliveryOtp: [OrderStatus.SHIPPED, OrderStatus.PACKED].includes(o.status) ? o.delivery_otp : null,
      items: o.items.map((i) => ({
        id: i.id,
        name: i.product.name,
        quantity: i.quantity,
        price: Number(i.price),
        image: i.product.image_url,
      })),
    }));

    const normalizedPujas = pujaOrders.map((p) => ({
      id: p.id,
      trackingId: `PUJA-${p.id}`,
      type: 'puja',
      name: p.puja?.name || 'Puja Service',
      itemCount: 1,
      amount: Number(p.price),
      status: p.status,
      date: p.created_at,
      paymentMethod: 'razorpay', // Default for now
      expertName: p.expert?.user?.name || 'Expert',
      scheduledDate: p.scheduled_date,
      scheduledTime: p.scheduled_time,
      items: [{
        id: p.puja_id,
        name: p.puja?.name || 'Puja Service',
        quantity: 1,
        price: Number(p.price),
        image: '', // Can add puja image if available
      }],
    }));

    // 4. Combine and Sort
    const combined = [...normalizedProducts, ...normalizedPujas].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const totalCount = combined.length;
    
    // 5. Paginate
    const paginatedData = (limit !== undefined && offset !== undefined)
      ? combined.slice(offset, offset + limit)
      : combined;

    return {
      data: paginatedData,
      totalCount,
    };
  }
}
