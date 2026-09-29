import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { orders } from '@/core/drizzledb/schema';
import { OrderStatus } from '@/internal/commerce/order/enum';
import type { OrderItem } from '@/internal/commerce/order/entities/order-item.entity';
import { PujaAppointmentService } from '@/internal/puja-appointment/puja-appointment.service';
import { GetMyOrdersDto } from '@/internal/commerce/order/dto/get-my-orders.dto';

@Injectable()
export class GetUserOrdersUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(forwardRef(() => PujaAppointmentService))
    private pujaAppointmentService: DeferredDependency<PujaAppointmentService>,
  ) {}

  async execute(profileId: number, userId: number, dto: GetMyOrdersDto) {
    const { limit, offset } = dto;

    // 1. Fetch Product Orders by client profile ID
    const productOrders = await this.db.query.orders.findMany({
      where: eq(orders.client_id, Number(profileId)),
      orderBy: desc(orders.created_at),
      with: {
        items: { with: { product: true } },
        client: { with: { user: true } },
      },
    });

    // 2. Fetch Puja Appointments (as Service Orders) — keyed to client profile ID
    const pujaOrders =
      await this.pujaAppointmentService.getUserAppointments(profileId);

    // 3. Normalize and Combine
    const normalizedProducts = productOrders.map((o) => {
      // Legacy `OrderItem.status` is typed `OrderItemStatus | OrderStatus | string`;
      // widen the Drizzle-narrowed rows to the same contract for the guards below.
      const items = (o.items ?? []) as unknown as OrderItem[];
      // Group items by merchant
      const merchantGroups: Record<
        string | number,
        {
          merchant_id: number;
          merchant_name: string;
          status: string;
          delivery_otp: string | null;
          cancellation_reason: string | null;
          items: any[];
        }
      > = {};

      items.forEach((i) => {
        const mId = i.product?.merchant_id || 0;
        const mName =
          (i.product as any)?.merchant?.shopName ||
          (i.product as any)?.merchant?.name ||
          'Shop';
        if (!merchantGroups[mId]) {
          merchantGroups[mId] = {
            merchant_id: mId,
            merchant_name: mName,
            status: i.status || 'pending',
            delivery_otp: i.delivery_otp || null,
            cancellation_reason: i.cancellation_reason || null,
            items: [],
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
      const cancelableStatuses = [
        OrderStatus.PENDING,
        OrderStatus.PAID,
        OrderStatus.PROCESSING,
      ];
      const isStatusCancelable = cancelableStatuses.includes(o.status);
      const allItemsCancelled =
        items.length > 0 &&
        items.every((i) => i.status === OrderStatus.CANCELLED);
      const is_cancelable = isStatusCancelable && !allItemsCancelled;

      return {
        id: o.id,
        tracking_id: `AIB-ORD-${String(o.id).padStart(6, '0')}`,
        type: 'product',
        name:
          o.items?.length > 0
            ? o.items[0].product?.name || 'Product Order'
            : 'Product Order',
        item_count: o.items?.length || 0,
        amount: Number(o.total_amount),
        shipping_charge: Number(o.shipping_charge) || 0,
        platform_fee: Number(o.platform_fee) || 0,
        discount_amount: Number(o.discount_amount) || 0,
        coupon_code: o.coupon_code || null,
        status: o.status,
        is_cancelable,
        date: o.created_at,
        merchant_id:
          o.items?.length > 0 ? o.items[0].product?.merchant_id || null : null,
        payment_method: o.payment_method,
        shipping_address: o.shipping_address,
        delivery_otp: o.delivery_otp || null,
        merchant_groups: Object.values(merchantGroups),
        items: items.map((i) => ({
          id: i.id,
          name: i.product?.name || 'Unknown Product',
          quantity: i.quantity,
          price: Number(i.price),
          image: i.product?.image_url || '',
          merchant_id: i.product?.merchant_id || null,
          merchant_name:
            (i.product as any)?.merchant?.shopName ||
            (i.product as any)?.merchant?.name ||
            'Shop',
          cancellation_reason: i.cancellation_reason || null,
          status: i.status || 'pending',
        })),
      };
    });

    const normalizedPujas = pujaOrders.map((p) => ({
      id: p.id,
      tracking_id: `AIB-PUJA-${String(p.id).padStart(6, '0')}`,
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
