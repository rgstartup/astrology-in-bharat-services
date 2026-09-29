import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientAccounts,
  orderItems,
  orders,
  products,
  users,
  type ClientAccountRow,
  type OrderItemRow,
  type OrderRow,
  type ProductRow,
  type UserRow,
} from '@/core/drizzledb/schema';
import type { OrderItem } from '@/internal/commerce/order/entities/order-item.entity';
import type { Order } from '@/internal/commerce/order/entities/order.entity';
import { SystemSetting } from '@/internal/actors/admin/entities/system-setting.entity';
import { OrderItemStatus, OrderStatus } from '@/internal/commerce/order/enum';
import type { MerchantOrderItem } from '@/internal/commerce/order/order.mapper';

@Injectable()
export class MerchantOrderQueriesUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    // Retained legacy read: no Drizzle mirror for `admin.system_settings` yet.
    // Migrates with the admin/system-settings module.
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
  ) {}

  async getMerchantTotalOrders(merchantId: number | string): Promise<number> {
    const [row] = await this.db
      .select({
        count: sql<string | number>`COUNT(DISTINCT ${orderItems.order_id})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.order_id, orders.id))
      .innerJoin(products, eq(orderItems.product_id, products.id))
      .where(
        and(
          eq(products.merchant_id, Number(merchantId)),
          ne(orders.status, OrderStatus.CANCELLED),
        ),
      );

    return Number(row?.count) || 0;
  }

  async getMerchantGrossTotalEarnings(
    merchantId: number | string,
  ): Promise<number> {
    const [row] = await this.db
      .select({
        sum: sql<
          string | number
        >`SUM(${orderItems.price} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.order_id, orders.id))
      .innerJoin(products, eq(orderItems.product_id, products.id))
      .where(
        and(
          eq(products.merchant_id, Number(merchantId)),
          eq(orderItems.status, OrderItemStatus.DELIVERED),
        ),
      );

    return Number(row?.sum) || 0;
  }

  async getMerchantGrossMonthlyEarnings(
    merchantId: number | string,
    startOfMonth: Date,
    endDate?: Date,
  ): Promise<number> {
    const conditions = [
      eq(products.merchant_id, Number(merchantId)),
      eq(orderItems.status, OrderItemStatus.DELIVERED),
      gte(orderItems.created_at, startOfMonth),
    ];
    if (endDate) {
      conditions.push(lte(orderItems.created_at, endDate));
    }

    const [row] = await this.db
      .select({
        sum: sql<
          string | number
        >`SUM(${orderItems.price} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.order_id, orders.id))
      .innerJoin(products, eq(orderItems.product_id, products.id))
      .where(and(...conditions));

    return Number(row?.sum) || 0;
  }

  async getMerchantOrders(
    merchantId: number | string,
    filters?: Record<string, unknown>,
  ): Promise<OrderItem[]> {
    const conditions = [eq(products.merchant_id, Number(merchantId))];

    if (filters?.status) {
      conditions.push(eq(orderItems.status, filters.status as OrderItemStatus));
    }

    let query = this.db
      .select({
        item: orderItems,
        order: orders,
        client: clientAccounts,
        user: users,
        product: products,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.order_id, orders.id))
      .innerJoin(clientAccounts, eq(orders.client_id, clientAccounts.id))
      .innerJoin(users, eq(clientAccounts.user_id, users.id))
      .innerJoin(products, eq(orderItems.product_id, products.id))
      .where(and(...conditions))
      .orderBy(desc(orders.created_at))
      .$dynamic();

    if (filters?.limit) {
      query = query.limit(filters.limit as number);
    }

    const rows = await query;
    return rows.map((r) =>
      this.toNestedItem(r.item, r.order, r.client, r.user, r.product),
    ) as unknown as OrderItem[];
  }

  async getMerchantRecentOrders(
    merchantId: number | string,
    limit: number = 5,
  ): Promise<OrderItem[]> {
    return this.getMerchantOrders(merchantId, { limit });
  }

  async sendOrderOtp(
    orderId: number | string,
    merchantId: number | string,
  ): Promise<{ order: Order; merchantItems: OrderItem[] }> {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, Number(orderId)),
      with: {
        items: { with: { product: true } },
        client: { with: { user: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const merchantItems = order.items.filter(
      (item) => item.product?.merchant_id === Number(merchantId),
    );
    if (merchantItems.length === 0) {
      throw new NotFoundException(
        'No products from your shop found in this order',
      );
    }

    // Generate OTP if not exists on items
    let currentOtp = merchantItems.find((i) => i.delivery_otp)?.delivery_otp;
    if (!currentOtp) {
      currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
      for (const item of merchantItems) {
        await this.db
          .update(orderItems)
          .set({ delivery_otp: currentOtp })
          .where(eq(orderItems.id, item.id));
        item.delivery_otp = currentOtp;
      }
    }

    // OTP logic is handled via NotificationService or similar usually, but for now we just return the order client info
    // so the merchant module can send it.
    return {
      order: order as unknown as Order,
      merchantItems: merchantItems as unknown as OrderItem[],
    };
  }

  async verifyOrderOtp(
    orderId: number | string,
    otp: string,
    merchantId: number | string,
  ): Promise<{ netPayout: number }> {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, Number(orderId)),
      with: { items: { with: { product: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const merchantItems = order.items.filter(
      (item) => item.product?.merchant_id === Number(merchantId),
    );
    if (merchantItems.length === 0) {
      throw new NotFoundException(
        'No products from your shop found in this order',
      );
    }

    const validOtp = merchantItems.some((item) => item.delivery_otp === otp);
    if (!validOtp) {
      throw new BadRequestException('Invalid delivery OTP');
    }

    let grossTotal = 0;
    merchantItems.forEach((item) => {
      grossTotal += Number(item.price) * (item.quantity || 1);
    });

    // Payout calculation
    const platformSetting = await this.settingRepo.findOne({
      where: { key: 'COMMISION_FROM_PUJA_SHOP' },
    });
    const gstSetting = await this.settingRepo.findOne({
      where: { key: 'GST_PERCENTAGE' },
    });

    const platformFeeRate = platformSetting
      ? parseFloat(platformSetting.value)
      : 10;
    const gstRate = gstSetting ? parseFloat(gstSetting.value) : 18;

    const estimatedFee = grossTotal * (platformFeeRate / 100);
    const estimatedGst = estimatedFee * (gstRate / 100);
    const netPayout = Number(
      (grossTotal - estimatedFee - estimatedGst).toFixed(2),
    );

    return { netPayout };
  }

  async getMerchantRevenueTimeline(
    merchantId: number | string,
  ): Promise<Array<{ date: string; revenue: string }>> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const day = sql<string>`TO_CHAR(${orderItems.created_at}, 'FMMon DD')`;
    const rows = await this.db
      .select({
        date: day,
        revenue: sql<string>`SUM(${orderItems.price} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.product_id, products.id))
      .where(
        and(
          eq(products.merchant_id, Number(merchantId)),
          gte(orderItems.created_at, thirtyDaysAgo),
          eq(orderItems.status, OrderItemStatus.DELIVERED),
        ),
      )
      .groupBy(day)
      .orderBy(asc(sql`MIN(${orderItems.created_at})`));

    return rows;
  }

  async getMerchantTopProducts(
    merchantId: number | string,
  ): Promise<
    Array<{ name: string; sales_count: string; total_revenue: string }>
  > {
    const rows = await this.db
      .select({
        name: products.name,
        sales_count: sql<string>`SUM(${orderItems.quantity})`,
        total_revenue: sql<string>`SUM(${orderItems.price} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.product_id, products.id))
      .where(eq(products.merchant_id, Number(merchantId)))
      .groupBy(products.name)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(10);

    return rows.map((r) => ({
      name: r.name ?? '',
      sales_count: String(r.sales_count),
      total_revenue: String(r.total_revenue),
    }));
  }

  async getMerchantOrdersWithStats(
    merchantId: number | string,
    page: number,
    limit: number,
    status?: string,
    search?: string,
  ) {
    const mId = Number(merchantId);

    // 1. Calculate Summary Statistics
    const [statsRow] = await this.db
      .select({
        total: count(orderItems.id),
        pending: sql<
          string | number
        >`SUM(CASE WHEN ${orderItems.status} IN ('pending', 'paid', 'processing', 'packed') THEN 1 ELSE 0 END)`,
        shipped: sql<
          string | number
        >`SUM(CASE WHEN ${orderItems.status} = 'shipped' THEN 1 ELSE 0 END)`,
        delivered: sql<
          string | number
        >`SUM(CASE WHEN ${orderItems.status} = 'delivered' THEN 1 ELSE 0 END)`,
        cancelled: sql<
          string | number
        >`SUM(CASE WHEN ${orderItems.status} = 'cancelled' THEN 1 ELSE 0 END)`,
        revenue: sql<
          string | number
        >`SUM(CASE WHEN ${orderItems.status} = 'delivered' THEN ${orderItems.price} * ${orderItems.quantity} ELSE 0 END)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.order_id, orders.id))
      .innerJoin(products, eq(orderItems.product_id, products.id))
      .where(eq(products.merchant_id, mId));

    const stats = {
      total: Number(statsRow?.total) || 0,
      pending: Number(statsRow?.pending) || 0,
      shipped: Number(statsRow?.shipped) || 0,
      delivered: Number(statsRow?.delivered) || 0,
      cancelled: Number(statsRow?.cancelled) || 0,
      revenue: Number(statsRow?.revenue) || 0,
    };

    // 2. Fetch Paginated & Filtered Orders
    const conditions = [eq(products.merchant_id, mId)];

    if (status && status.toLowerCase() !== 'all') {
      const searchStatus = status.toLowerCase();
      if (searchStatus === 'pending') {
        conditions.push(
          inArray(orderItems.status, [
            OrderItemStatus.PENDING,
            OrderItemStatus.PAID,
          ]),
        );
      } else {
        conditions.push(eq(orderItems.status, searchStatus as OrderItemStatus));
      }
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(users.name, searchTerm),
          ilike(products.name, searchTerm),
          sql`CAST(${orders.id} AS TEXT) ILIKE ${searchTerm}`,
        )!,
      );
    }

    const where = and(...conditions);

    const itemQuery = this.db
      .select({
        item: orderItems,
        order: orders,
        client: clientAccounts,
        user: users,
        product: products,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.order_id, orders.id))
      .leftJoin(clientAccounts, eq(orders.client_id, clientAccounts.id))
      .leftJoin(users, eq(clientAccounts.user_id, users.id))
      .innerJoin(products, eq(orderItems.product_id, products.id))
      .where(where)
      .orderBy(desc(orderItems.created_at))
      .offset((page - 1) * limit)
      .limit(limit);

    const countQuery = this.db
      .select({ total: count() })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.order_id, orders.id))
      .leftJoin(clientAccounts, eq(orders.client_id, clientAccounts.id))
      .leftJoin(users, eq(clientAccounts.user_id, users.id))
      .innerJoin(products, eq(orderItems.product_id, products.id))
      .where(where);

    const [itemRows, countRows] = await Promise.all([itemQuery, countQuery]);

    const items = itemRows.map((r) =>
      this.toNestedItem(r.item, r.order, r.client, r.user, r.product),
    ) as unknown as OrderItem[];

    return { stats, items, totalCount: Number(countRows[0]?.total ?? 0) };
  }

  private toNestedItem(
    item: OrderItemRow,
    order: OrderRow,
    client: ClientAccountRow | null,
    user: UserRow | null,
    product: ProductRow,
  ): MerchantOrderItem {
    return {
      ...item,
      order: { ...order, client: client ? { ...client, user } : null },
      product,
    };
  }
}
