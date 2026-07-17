import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/entities/order.entity';
import { PujaAppointmentFacade } from '@/modules/puja-appointment/application/puja-appointment.facade';
import { GetMyOrdersDto } from '../../api/dto/get-my-orders.dto';

@Injectable()
export class GetUserOrdersUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @Inject(forwardRef(() => PujaAppointmentFacade))
    private pujaAppointmentFacade: PujaAppointmentFacade,
  ) {}

  async execute(
    profileId: string,
    userId: string,
    dto: GetMyOrdersDto,
  ) {
    const { limit, offset } = dto;

    // 1. Fetch Product Orders by client profile ID
    const productOrders = await this.orderRepo.find({
      where: { client_id: profileId },
      relations: ['items', 'items.product', 'client', 'client.user'],
      order: { created_at: 'DESC' },
    });

    // 2. Fetch Puja Appointments (as Service Orders) — keyed to client profile ID
    const pujaOrders =
      await this.pujaAppointmentFacade.getUserAppointments(profileId);

    // 3. Normalize and Combine
    const normalizedProducts = productOrders.map((o) => {
      // Group items by merchant
      const merchantGroups: Record<string, {
        merchant_id: string;
        merchant_name: string;
        status: string;
        delivery_otp: string | null;
        cancellation_reason: string | null;
        items: any[];
      }> = {};

      (o.items || []).forEach((i) => {
        const mId = i.product?.merchant_id || 'unknown';
        const mName = (i.product as any)?.merchant?.shopName || (i.product as any)?.merchant?.name || 'Shop';
        if (!merchantGroups[mId]) {
          merchantGroups[mId] = { 
            merchant_id: mId, 
            merchant_name: mName, 
            status: i.status || 'pending',
            delivery_otp: i.delivery_otp || null,
            cancellation_reason: i.cancellation_reason || null,
            items: [] 
          };
        }
        merchantGroups[mId].items.push({
          id: i.id,
          name: i.product?.name || 'Unknown Product',
          quantity: i.quantity,
          price: Number(i.price),
          image: i.product?.image_url || '',
          merchant_id: mId,
          merchant_name: mName,
          status: i.status || 'pending',
          cancellation_reason: i.cancellation_reason || null,
        });
      });
      const cancelableStatuses = [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING];
      const isStatusCancelable = cancelableStatuses.includes(o.status);
      const allItemsCancelled = (o.items || []).length > 0 && (o.items || []).every(i => i.status === OrderStatus.CANCELLED);
      const is_cancelable = isStatusCancelable && !allItemsCancelled;

      return {
        id: o.id,
        tracking_id: `AIB-ORD-${o.id.split('-')[0].toUpperCase()}`,
        type: 'product',
        name: o.items?.length > 0 ? (o.items[0].product?.name || 'Product Order') : 'Product Order',
        item_count: o.items?.length || 0,
        amount: Number(o.total_amount),
        shipping_charge: Number(o.shipping_charge) || 0,
        status: o.status,
        is_cancelable,
        date: o.created_at,
        merchant_id: o.items?.length > 0 ? (o.items[0].product?.merchant_id || null) : null,
        payment_method: o.payment_method,
        shipping_address: o.shipping_address,
        delivery_otp: o.delivery_otp || null,
        merchant_groups: Object.values(merchantGroups),
        items: (o.items || []).map((i) => ({
          id: i.id,
          name: i.product?.name || 'Unknown Product',
          quantity: i.quantity,
          price: Number(i.price),
          image: i.product?.image_url || '',
          merchant_id: i.product?.merchant_id || null,
          merchant_name: (i.product as any)?.merchant?.shopName || (i.product as any)?.merchant?.name || 'Shop',
          cancellation_reason: i.cancellation_reason || null,
          status: i.status || 'pending',
        })),
      };
    });

    const normalizedPujas = pujaOrders.map((p) => ({
      id: p.id,
      tracking_id: `AIB-PUJA-${p.id.split('-')[0].toUpperCase()}`,
      type: 'puja',
      name: p.puja?.name || 'Puja Service',
      item_count: 1,
      amount: Number(p.price),
      status: p.status,
      date: p.created_at,
      payment_method: 'razorpay', // Default for now
      expert_name: p.expert?.user?.name || p.expert?.name || 'Expert',
      expert_id: p.expert?.id || p.expert_id,
      scheduled_date: p.scheduled_date,
      scheduled_time: p.scheduled_time,
      items: [
        {
          id: p.puja_id || (p.puja && p.puja.id),
          name: p.puja?.name || 'Puja Service',
          quantity: 1,
          price: Number(p.price),
          image: '', // Can add puja image if available
        },
      ],
    }));

    // 4. Combine and Sort
    const combined = [...normalizedProducts, ...normalizedPujas].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const totalCount = combined.length;

    // 5. Paginate
    const paginatedData =
      limit !== undefined && offset !== undefined
        ? combined.slice(offset, offset + limit)
        : combined;

    return {
      data: paginatedData,
      total_count: totalCount,
    };
  }
}
