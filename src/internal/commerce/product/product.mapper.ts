import type { ProductRow } from '@/core/drizzledb/schema';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';

export type ProductStatus = 'active' | 'draft' | 'out_of_stock';

export interface ProductWithLikesRaw extends ProductRow {
  likes_count: number;
}

export interface PaginatedProductsResponse extends PaginatedResponseDto<ProductWithLikesRaw> {}

export interface MerchantProductResponse {
  id: number;
  short_id: string;
  name: string;
  productName: string;
  category: string;
  sku: string | undefined;
  price: number;
  stock: number;
  status: ProductStatus;
  image_url: string;
  imageUrl: string;
  productImage: string;
  gallery: string[];
  description: string;
  original_price: number;
  created_at: Date;
  is_shipping_chargeable: boolean;
  shipping_charge: number;
}

/**
 * Drizzle `numeric` columns come back as strings from the driver — normalize
 * to number at the use-case boundary (TypeORM did the same conversion
 * defensively via `Number(...)` at every read site).
 */
function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

/**
 * The legacy entity declares `gallery` as `simple-array` (comma-joined text
 * in `commerce.products.gallery`); the Drizzle mirror is plain `text`, so
 * split back to an array at the boundary.
 */
function toGallery(value: string | null | undefined): string[] | null {
  if (value == null || value === '') return null;
  const parts = value.split(',').filter((s) => s.length > 0);
  return parts.length > 0 ? parts : null;
}

function toGalleryArray(value: string | null | undefined): string[] {
  return toGallery(value) ?? [];
}

/** Shape returned by `FindProductUseCase` / `CreateProductUseCase`. */
export function toProductDetails<T extends ProductRow>(row: T) {
  return {
    ...row,
    price: toNumber(row.price),
    original_price:
      row.original_price != null
        ? toNumber(row.original_price)
        : toNumber(row.price),
    image_url: row.image_url ?? '',
    percentage_off:
      row.percentage_off != null ? toNumber(row.percentage_off) : 0,
    shipping_charge: toNumber(row.shipping_charge),
    gallery: toGallery(row.gallery),
  };
}

/** Public storefront list item (`find-all`) with computed extras. */
export function toProductListItem(
  row: ProductRow,
  computed: {
    percentage_off: string | number | null;
    likes_count: string | number | null;
  },
): ProductWithLikesRaw {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    description: row.description,
    short_description: row.short_description,
    product_group: row.product_group,
    type: row.type,
    price: row.price,
    original_price: row.original_price,
    image_url: row.image_url ?? '',
    gallery: toGallery(row.gallery) as unknown as string,
    stock: row.stock,
    merchant_id: row.merchant_id,
    is_shipping_chargeable: row.is_shipping_chargeable,
    shipping_charge: row.shipping_charge,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    percentage_off:
      computed.percentage_off == null
        ? '0'
        : computed.percentage_off.toString(),
    likes_count:
      computed.likes_count == null ? 0 : Number(computed.likes_count),
  };
}

/** Merchant dashboard card shape (mirrors the legacy `toResponse`). */
export function toMerchantProductResponse(
  row: ProductRow,
): MerchantProductResponse {
  let status: ProductStatus = 'draft';
  if (row.stock === 0) {
    status = 'out_of_stock';
  } else if (row.is_active) {
    status = 'active';
  }

  return {
    id: row.id,
    short_id: String(row.id).slice(-8).toUpperCase(),
    name: row.name,
    productName: row.name,
    category: row.category ?? 'General',
    sku: row.sku ?? undefined,
    price: toNumber(row.price),
    stock: row.stock,
    status,
    image_url: row.image_url ?? '',
    imageUrl: row.image_url ?? '',
    productImage: row.image_url ?? '',
    gallery: toGalleryArray(row.gallery),
    description: row.description,
    original_price:
      row.original_price != null
        ? toNumber(row.original_price)
        : toNumber(row.price),
    created_at: row.created_at,
    is_shipping_chargeable: row.is_shipping_chargeable ?? false,
    shipping_charge: toNumber(row.shipping_charge),
  };
}
