import type {
  CartItemRow,
  CartRow,
  ProductRow,
  ProductVariantRow,
} from '../../../../core/drizzledb/schema';

/**
 * Product with `numeric` columns normalized to numbers and the
 * `simple-array` `gallery` text split back into an array — mirroring what
 * the legacy TypeORM entity returned (`ColumnNumericTransformer` +
 * `simple-array` handling).
 */
export interface CartProductDetails extends Omit<
  ProductRow,
  'price' | 'original_price' | 'shipping_charge' | 'percentage_off' | 'gallery'
> {
  price: number;
  original_price: number;
  shipping_charge: number;
  percentage_off: number;
  gallery: string[] | null;
}

/**
 * Cart item with its relations loaded. Mirrors the legacy `getCart`
 * (`relations: ['items', 'items.product']` + eager `variant`).
 * FKs are nullable, so relations stay nullable here too.
 */
export interface CartItemDetails extends CartItemRow {
  product: CartProductDetails | null;
  variant: ProductVariantRow | null;
}

/** Cart with items loaded. The `client` relation was never loaded — omitted. */
export interface CartDetails extends CartRow {
  items: CartItemDetails[];
}

export function toCartProductResponse(row: ProductRow): CartProductDetails {
  return {
    ...row,
    price: Number(row.price),
    original_price: Number(row.original_price),
    shipping_charge: Number(row.shipping_charge),
    percentage_off: Number(row.percentage_off),
    gallery: row.gallery != null ? row.gallery.split(',') : null,
  };
}

export function toCartItemResponse(
  item: {
    product: ProductRow | null;
    variant: ProductVariantRow | null;
  } & CartItemRow,
): CartItemDetails {
  return {
    ...item,
    product: item.product ? toCartProductResponse(item.product) : null,
    variant: item.variant ?? null,
  };
}

export function toCartDetails(
  cart: {
    items: ({
      product: ProductRow | null;
      variant: ProductVariantRow | null;
    } & CartItemRow)[];
  } & CartRow,
): CartDetails {
  return {
    ...cart,
    items: cart.items.map(toCartItemResponse),
  };
}
