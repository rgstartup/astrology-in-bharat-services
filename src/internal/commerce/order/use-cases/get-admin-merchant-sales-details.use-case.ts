import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { and, desc, eq, notInArray } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientAccounts,
  orderItems,
  orders,
  products,
} from '@/core/drizzledb/schema';
import { OrderStatus } from '@/internal/commerce/order/enum';
import { MerchantAccountService } from '@/internal/actors/merchant/account/account.service';

@Injectable()
export class GetAdminMerchantSalesDetailsUseCase {
  constructor(
    @Inject(forwardRef(() => MerchantAccountService))
    private readonly merchantService: DeferredDependency<MerchantAccountService>,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async execute(merchantId: number) {
    try {
      // 1. Verify merchant exists and get their user_id
      const merchant = await this.merchantService.getProfileById(merchantId);

      if (!merchant) {
        throw new NotFoundException(`Merchant with ID ${merchantId} not found`);
      }

      // 2. Fetch all order items for this merchant's products
      const items = await this.db
        .select({
          item: orderItems,
          product: products,
          order: orders,
          client: clientAccounts,
        })
        .from(orderItems)
        .leftJoin(products, eq(products.id, orderItems.product_id))
        .leftJoin(orders, eq(orders.id, orderItems.order_id))
        .leftJoin(clientAccounts, eq(clientAccounts.id, orders.client_id))
        .where(
          and(
            eq(products.merchant_id, merchant.user_id),
            notInArray(orders.status, [
              OrderStatus.CANCELLED,
              OrderStatus.PENDING,
            ]),
          ),
        )
        .orderBy(desc(orders.created_at));

      // 3. Return formatted details
      return {
        merchant: {
          id: merchant.id,
          shopName: merchant.shop_name,
          managerName: merchant.manager_name,
          city: merchant.city,
        },
        sales: items.map((r) => ({
          id: r.item.id,
          orderId: r.item.order_id,
          product: {
            id: r.product?.id,
            name: r.product?.name,
            sku: r.product?.sku,
            price: Number(r.item.price),
          },
          quantity: r.item.quantity,
          totalPrice: Number(r.item.price) * r.item.quantity,
          customer: {
            id: r.client?.id,
            name: r.client?.name,
            phone: r.client?.phone || 'N/A',
            email: r.client?.email,
          },
          status: r.order?.status,
          date: r.order?.created_at,
        })),
      };
    } catch (error) {
      console.error('Error in GetAdminMerchantSalesDetailsUseCase:', error);
      throw error;
    }
  }
}
