import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { products } from '@/core/drizzledb/schema';
import { GetProductsDto } from '@/internal/commerce/product/dto/get-products.dto';
import {
  ProductWithLikesRaw,
  toProductListItem,
  type PaginatedProductsResponse,
} from '@/internal/commerce/product/product.mapper';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';

export type {
  ProductWithLikesRaw,
  PaginatedProductsResponse,
} from '@/internal/commerce/product/product.mapper';

@Injectable()
export class FindAllProductsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(dto: GetProductsDto): Promise<PaginatedProductsResponse> {
    const { merchantId, limit, skip } = dto;

    const conditions = [eq(products.is_active, true)];

    if (merchantId) {
      const merchantIdNum = Number(merchantId);
      if (!Number.isFinite(merchantIdNum)) {
        return PaginatedResponseDto.from([] as ProductWithLikesRaw[], 0, dto);
      }
      conditions.push(eq(products.merchant_id, merchantIdNum));
    }

    const where = and(...conditions);

    // Compute percentage_off + likes_count in the query (mirrors legacy raw select)
    const [rows, totalRows] = await Promise.all([
      this.db
        .select({
          product: products,
          percentage_off: sql<string | number>`
            CASE
              WHEN ${products.original_price} IS NOT NULL AND ${products.original_price} > ${products.price}
              THEN ROUND(((${products.original_price} - ${products.price}) / ${products.original_price}) * 100)::int
              ELSE 0
            END
          `,
          likes_count: sql<string | number>`
            (SELECT COALESCE(COUNT(w.id), 0)::int FROM commerce.wishlists w WHERE w.product_id = ${products.id})
          `,
        })
        .from(products)
        .where(where)
        .orderBy(desc(products.created_at))
        .offset(skip)
        .limit(limit),
      this.db.select({ total: count() }).from(products).where(where),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);

    return PaginatedResponseDto.from(
      rows.map((r) =>
        toProductListItem(r.product, {
          percentage_off: r.percentage_off,
          likes_count: r.likes_count,
        }),
      ),
      total,
      dto,
    );
  }
}
