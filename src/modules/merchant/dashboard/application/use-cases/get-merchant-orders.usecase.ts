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

    return {
      orders: items.map((item) => ({
        id: item.id.toString(),
        orderId: item.order.id.toString(),
        orderNumber: `ORD-${item.order.id}`,
        customerName:
          (item.order as unknown as { client?: { user?: { name?: string } } })
            .client?.user?.name || 'Guest',
        amount: Number(item.price) * item.quantity,
        status: item.order.status,
        date: item.order.created_at.toISOString(),
        itemsCount: item.quantity,
        productName: item.product.name,
      })),
      stats,
      total: totalCount,
      page,
      limit,
    };
  }
}
