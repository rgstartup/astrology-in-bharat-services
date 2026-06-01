import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '@/modules/commerce/order/infrastructure/entities/order-item.entity';
import { OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Injectable()
export class GetMerchantOrdersUseCase {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepo: Repository<ProfileMerchant>,
  ) {}

  async execute(userId: string, page: number = 1, limit: number = 20, status?: string, search?: string) {
    console.log('[ALL_ORDERS] Request:', { userId, page, limit, status, search });

    // Resolve merchant profile ID from user ID
    const merchantProfile = await this.merchantRepo.findOne({
      where: { user_id: userId as any },
      select: ['id'],
    });
    const merchantId = merchantProfile?.id;

    if (!merchantId) {
      return { orders: [], stats: { total: 0, pending: 0, shipped: 0, delivered: 0, cancelled: 0, revenue: 0 }, total: 0, page, limit };
    }

    // 1. Calculate Summary Statistics
    const statsResult = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .where('p.merchant_id = :merchantId', { merchantId })
      .select([
        'COUNT(oi.id) as total',
        `SUM(CASE WHEN o.status IN ('${OrderStatus.PENDING}', '${OrderStatus.PAID}', '${OrderStatus.PROCESSING}', '${OrderStatus.PACKED}') THEN 1 ELSE 0 END) as pending`,
        `SUM(CASE WHEN o.status = '${OrderStatus.SHIPPED}' THEN 1 ELSE 0 END) as shipped`,
        `SUM(CASE WHEN o.status = '${OrderStatus.DELIVERED}' THEN 1 ELSE 0 END) as delivered`,
        `SUM(CASE WHEN o.status = '${OrderStatus.CANCELLED}' THEN 1 ELSE 0 END) as cancelled`,
        `SUM(CASE WHEN o.status != '${OrderStatus.CANCELLED}' THEN oi.price * oi.quantity ELSE 0 END) as revenue`,
      ])
      .getRawOne();

    const stats = {
      total: Number(statsResult.total) || 0,
      pending: Number(statsResult.pending) || 0,
      shipped: Number(statsResult.shipped) || 0,
      delivered: Number(statsResult.delivered) || 0,
      cancelled: Number(statsResult.cancelled) || 0,
      revenue: Number(statsResult.revenue) || 0,
    };

    // 2. Fetch Paginated & Filtered Orders
    const query = this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoinAndSelect('oi.order', 'o')
      .leftJoinAndSelect('o.client', 'client')          // ✅ Order has 'client' relation
      .leftJoinAndSelect('client.user', 'u')             // ✅ ProfileClient has 'user' relation
      .innerJoinAndSelect('oi.product', 'p')
      .where('p.merchant_id = :merchantId', { merchantId });

    if (status && status.toLowerCase() !== 'all') {
      const searchStatus = status.toLowerCase();
      if (searchStatus === 'pending') {
        query.andWhere('o.status IN (:...statuses)', {
          statuses: [OrderStatus.PENDING, OrderStatus.PAID]
        });
      } else {
        query.andWhere('o.status = :status', { status: searchStatus });
      }
    }

    if (search) {
      query.andWhere('(u.name ILIKE :searchTerm OR p.name ILIKE :searchTerm OR CAST(o.id AS TEXT) ILIKE :searchTerm)', {
        searchTerm: `%${search}%`
      });
    }

    const [items, totalCount] = await query
      .orderBy('oi.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      orders: items.map((item) => ({
        id: item.id.toString(),
        orderId: item.order.id.toString(),
        orderNumber: `ORD-${item.order.id}`,
        customerName: (item.order as any).client?.user?.name || 'Guest',
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
