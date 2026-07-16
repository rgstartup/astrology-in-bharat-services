import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

import { GetMerchantOrdersDto } from '../../api/dto/get-merchant-orders.dto';

@Injectable()
export class GetMerchantOrdersUseCase {
  constructor(
    private readonly orderFacade: OrderFacade,
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepo: Repository<ProfileMerchant>,
  ) {}

  async execute(
    userId: string,
    dto: GetMerchantOrdersDto,
  ) {
    const { page = 1, limit = 20, status, search } = dto;
    const merchantId = userId;

    if (!merchantId) {
      return {
        orders: [],
        stats: {
          total: 0,
          pending: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          revenue: 0,
        },
        total: 0,
        page,
        limit,
      };
    }

    const { stats, items, totalCount } =
      await this.orderFacade.getMerchantOrdersWithStats(
        merchantId,
        page,
        limit,
        status,
        search,
      );

    const groupedOrdersMap = new Map<string, any>();
    try {
      for (const item of items) {
        const orderIdStr = item.order?.id?.toString() || item.order_id;
        if (!groupedOrdersMap.has(orderIdStr)) {
          groupedOrdersMap.set(orderIdStr, {
            id: item.order?.id?.toString() || item.order_id,
            short_id: (item.order?.id?.toString() || item.order_id).slice(-8).toUpperCase(),
            orderId: orderIdStr,
            orderNumber: `AIB-ORD-${orderIdStr.split('-')[0].toUpperCase()}`,
            customerName:
              (item.order as unknown as { client?: { user?: { name?: string }; name?: string } })
                ?.client?.name ||
              (item.order as unknown as { client?: { user?: { name?: string } } })
                ?.client?.user?.name || 'Guest',
            customerImage: (() => {
              const avatar = (item.order as any)?.client?.avatar || (item.order as any)?.client?.user?.avatar || null;
              console.log('DEBUG AVATAR for Order', orderIdStr, ':', avatar, 'Client:', (item.order as any)?.client);
              return avatar;
            })(),
            shippingAddress: (item.order as any)?.shipping_address ? {
              fullName: (item.order as any).shipping_address.full_name || (item.order as any).shipping_address.fullName || '',
              addressLine1: (item.order as any).shipping_address.line1 || (item.order as any).shipping_address.addressLine1 || '',
              addressLine2: (item.order as any).shipping_address.line2 || (item.order as any).shipping_address.addressLine2 || '',
              city: (item.order as any).shipping_address.city || '',
              state: (item.order as any).shipping_address.state || '',
              pincode: (item.order as any).shipping_address.zip_code || (item.order as any).shipping_address.pincode || '',
              phone: (item.order as any).shipping_address.phone || '',
              alternatePhone: (item.order as any).shipping_address.alternate_phone || (item.order as any).shipping_address.alternatePhone || ''
            } : null,
            amount: 0,
            status: item.status || item.order?.status || 'pending',
            date: item.order?.created_at ? new Date(item.order.created_at).toISOString() : new Date().toISOString(),
            itemsCount: 0,
            productName: item.product?.name || 'Unknown Product',
            items: []
          });
        }
        
        const group = groupedOrdersMap.get(orderIdStr);
        group.amount += Number(item.price || 0) * (item.quantity || 1);
        group.itemsCount += (item.quantity || 1);
        
        group.items.push({
          id: item.id?.toString(),
          short_id: item.id?.toString().slice(-8).toUpperCase(),
          productId: item.product?.id?.toString(),
          shortProductId: item.product?.id?.toString().slice(-8).toUpperCase(),
          name: item.product?.name || 'Unknown Product',
          quantity: item.quantity,
          price: Number(item.price || 0),
          image: item.product?.image_url || null,
          status: item.status,
        });
        
        if (group.productName !== item.product?.name && !group.productName.includes('+')) {
           group.productName = `${group.productName} + more`;
        }
      }
    } catch (err) {
      console.error('Error grouping merchant orders:', err);
    }

    return {
      orders: Array.from(groupedOrdersMap.values()),
      stats,
      total: totalCount,
      page,
      limit,
    };
  }
}
