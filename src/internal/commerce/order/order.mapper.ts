import type {
  ClientAccountRow,
  OrderItemRow,
  OrderRow,
  ProductRow,
  UserRow,
} from '@/core/drizzledb/schema';

export interface OrderItemWithProduct extends OrderItemRow {
  product: ProductRow | null;
}

export interface OrderClientWithUser extends ClientAccountRow {
  user: UserRow | null;
}

export interface OrderWithDetails extends OrderRow {
  items: OrderItemWithProduct[];
  client: OrderClientWithUser | null;
}

export interface MerchantOrderItem extends OrderItemRow {
  order: (OrderRow & { client: OrderClientWithUser | null }) | null;
  product: ProductRow | null;
}

/**
 * Drizzle `numeric` columns come back as strings from the driver — normalize
 * to number at the use-case boundary.
 */
export function toOrderAmounts<T extends OrderRow>(row: T) {
  return {
    ...row,
    subtotal_amount: Number(row.subtotal_amount),
    discount_amount: Number(row.discount_amount),
    shipping_charge: Number(row.shipping_charge),
    tax_amount: Number(row.tax_amount),
    platform_fee: Number(row.platform_fee),
    total_amount: Number(row.total_amount),
  };
}

export function toOrderItemAmounts<T extends OrderItemRow>(row: T) {
  return {
    ...row,
    price: Number(row.price),
    unit_mrp: row.unit_mrp == null ? null : Number(row.unit_mrp),
    discount_amount: Number(row.discount_amount),
    tax_amount: Number(row.tax_amount),
  };
}
