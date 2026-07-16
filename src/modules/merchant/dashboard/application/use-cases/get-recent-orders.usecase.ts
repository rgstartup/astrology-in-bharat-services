import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Injectable()
export class GetRecentOrdersUseCase {
  constructor(
    private readonly orderFacade: OrderFacade,
    @InjectRepository(ProfileMerchant)
    private readonly profileRepo: Repository<ProfileMerchant>,
  ) {}

  async execute(userId: string) {
    const merchantId = userId;

    console.log('[RECENT_ORDERS] Request for userId:', userId);
    const recentOrderItems = await this.orderFacade.getMerchantRecentOrders(
      merchantId,
      10,
    );

    const groupedOrdersMap = new Map<string, any>();
    
    try {
      for (const item of recentOrderItems) {
        const orderIdStr = item.order?.id?.toString() || item.order_id;
        if (!groupedOrdersMap.has(orderIdStr)) {
          groupedOrdersMap.set(orderIdStr, {
            id: item.order?.id?.toString() || item.order_id,
            short_id: (item.order?.id?.toString() || item.order_id).slice(-8).toUpperCase(),
            orderNumber: `AIB-ORD-${orderIdStr.split('-')[4]?.toUpperCase() || orderIdStr.slice(-8).toUpperCase()}`,
            customerName:
              (item.order as unknown as { client?: { user?: { name?: string } } })
                ?.client?.user?.name || 'Guest',
            amount: 0,
            status: item.status || item.order?.status || 'pending',
            date: item.order?.created_at ? new Date(item.order.created_at).toISOString() : new Date().toISOString(),
            productName: item.product?.name || 'Unknown Product',
          });
        }
        
        const group = groupedOrdersMap.get(orderIdStr);
        group.amount += Number(item.price || 0) * (item.quantity || 1);
        
        if (group.productName !== item.product?.name && !group.productName.includes('+')) {
           group.productName = `${group.productName} + more`;
        }
      }
    } catch (err) {
      console.error('Error grouping recent orders:', err);
    }

    return Array.from(groupedOrdersMap.values());
  }
}
