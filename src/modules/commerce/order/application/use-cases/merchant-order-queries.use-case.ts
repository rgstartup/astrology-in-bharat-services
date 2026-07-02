import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '../../infrastructure/entities/order-item.entity';
import { Order } from '../../infrastructure/entities/order.entity';

@Injectable()
export class MerchantOrderQueriesUseCase {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async getMerchantTotalOrders(merchantId: string): Promise<number> {
    const totalOrdersQuery = (await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .where('p.merchant_id = :merchantId', { merchantId })
      .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
      .select('COUNT(DISTINCT oi.order_id)', 'count')
      .getRawOne()) as { count?: string | number };

    return Number(totalOrdersQuery?.count) || 0;
  }

  async getMerchantGrossTotalEarnings(merchantId: string): Promise<number> {
    const totalEarningsQuery = (await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .where('p.merchant_id = :merchantId', { merchantId })
      .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
      .select('SUM(oi.price * oi.quantity)', 'sum')
      .getRawOne()) as { sum?: string | number };

    return Number(totalEarningsQuery?.sum) || 0;
  }

  async getMerchantGrossMonthlyEarnings(
    merchantId: string,
    startOfMonth: Date,
  ): Promise<number> {
    const monthlyEarningsQuery = (await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .where('p.merchant_id = :merchantId', { merchantId })
      .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('oi.created_at >= :startOfMonth', { startOfMonth })
      .select('SUM(oi.price * oi.quantity)', 'sum')
      .getRawOne()) as { sum?: string | number };

    return Number(monthlyEarningsQuery?.sum) || 0;
  }

  async getMerchantOrders(
    merchantId: string,
    filters?: Record<string, unknown>,
  ): Promise<OrderItem[]> {
    const query = this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoinAndSelect('oi.order', 'order')
      .innerJoinAndSelect('order.client', 'client')
      .innerJoinAndSelect('client.user', 'user')
      .innerJoinAndSelect('oi.product', 'product')
      .where('product.merchant_id = :merchantId', { merchantId });

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    query.orderBy('order.created_at', 'DESC');

    if (filters?.limit) {
      query.take(filters.limit as number);
    }

    return query.getMany();
  }

  async getMerchantRecentOrders(
    merchantId: string,
    limit: number = 5,
  ): Promise<OrderItem[]> {
    return this.getMerchantOrders(merchantId, { limit });
  }

  async sendOrderOtp(
    orderId: string,
    merchantId: string,
  ): Promise<{ order: Order; merchantItems: OrderItem[] }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId as unknown as string },
      relations: ['items', 'items.product', 'client', 'client.user'],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const merchantItems = order.items.filter(
      (item) => item.product.merchant_id === merchantId,
    );
    if (merchantItems.length === 0) {
      throw new Error('No products from your shop found in this order');
    }

    // Generate OTP if not exists
    if (!order.delivery_otp) {
      order.delivery_otp = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      await this.orderRepo.save(order);
    }

    // OTP logic is handled via NotificationFacade or similar usually, but for now we just return the order client info
    // so the merchant module can send it.
    return { order, merchantItems };
  }

  async verifyOrderOtp(
    orderId: string,
    otp: string,
    merchantId: string,
    walletFacade: {
      getAdminCommissionFromSetting: (setting: string) => Promise<number>;
    },
  ): Promise<{ netPayout: number }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId as unknown as string },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.delivery_otp !== otp) {
      throw new Error('Invalid delivery OTP');
    }

    const merchantItems = order.items.filter(
      (item) => item.product.merchant_id === merchantId,
    );
    if (merchantItems.length === 0) {
      throw new Error('No products from your shop found in this order');
    }

    let grossTotal = 0;
    merchantItems.forEach((item) => {
      grossTotal += Number(item.price) * (item.quantity || 1);
    });

    // Payout calculation
    const platformFeeRate = await walletFacade.getAdminCommissionFromSetting(
      'COMMISION_FROM_PUJA_SHOP',
    );
    const gstRate =
      await walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');

    const estimatedFee = grossTotal * (platformFeeRate / 100);
    const estimatedGst = estimatedFee * (gstRate / 100);
    const netPayout = Number(
      (grossTotal - estimatedFee - estimatedGst).toFixed(2),
    );

    return { netPayout };
  }

  async getMerchantRevenueTimeline(
    merchantId: string,
  ): Promise<Array<{ date: string; revenue: string }>> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    return await this.orderItemRepo.query(
      `
      SELECT 
        TO_CHAR(oi.created_at, 'FMMon DD') as date,
        SUM(oi.price * oi.quantity) as revenue
      FROM commerce.order_items oi
      INNER JOIN commerce.products p ON p.id = oi.product_id
      WHERE p.merchant_id = $1
      AND oi.created_at >= $2
      GROUP BY TO_CHAR(oi.created_at, 'FMMon DD')
      ORDER BY MIN(oi.created_at) ASC
    `,
      [merchantId, thirtyDaysAgo],
    );
  }

  async getMerchantTopProducts(
    merchantId: string,
  ): Promise<
    Array<{ name: string; sales_count: string; total_revenue: string }>
  > {
    return await this.orderItemRepo.query(
      `
      SELECT 
        p.name as "name",
        SUM(oi.quantity) as "sales_count",
        SUM(oi.price * oi.quantity) as "total_revenue"
      FROM commerce.order_items oi
      INNER JOIN commerce.products p ON p.id = oi.product_id
      WHERE p.merchant_id = $1
      GROUP BY p.name
      ORDER BY sales_count DESC
      LIMIT 10
    `,
      [merchantId],
    );
  }

  async getMerchantOrdersWithStats(
    merchantId: string,
    page: number,
    limit: number,
    status?: string,
    search?: string,
  ) {
    // 1. Calculate Summary Statistics
    const statsResult = (await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .where('p.merchant_id = :merchantId', { merchantId })
      .select([
        'COUNT(oi.id) as total',
        `SUM(CASE WHEN o.status IN ('pending', 'paid', 'processing', 'packed') THEN 1 ELSE 0 END) as pending`,
        `SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) as shipped`,
        `SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as delivered`,
        `SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled`,
        `SUM(CASE WHEN o.status != 'cancelled' THEN oi.price * oi.quantity ELSE 0 END) as revenue`,
      ])
      .getRawOne()) as Record<string, string | number>;

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
      .leftJoinAndSelect('o.client', 'client')
      .leftJoinAndSelect('client.user', 'u')
      .innerJoinAndSelect('oi.product', 'p')
      .where('p.merchant_id = :merchantId', { merchantId });

    if (status && status.toLowerCase() !== 'all') {
      const searchStatus = status.toLowerCase();
      if (searchStatus === 'pending') {
        query.andWhere('o.status IN (:...statuses)', {
          statuses: ['pending', 'paid'],
        });
      } else {
        query.andWhere('o.status = :status', { status: searchStatus });
      }
    }

    if (search) {
      query.andWhere(
        '(u.name ILIKE :searchTerm OR p.name ILIKE :searchTerm OR CAST(o.id AS TEXT) ILIKE :searchTerm)',
        {
          searchTerm: `%${search}%`,
        },
      );
    }

    const [items, totalCount] = await query
      .orderBy('oi.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { stats, items, totalCount };
  }
}
