import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { products, productVariants, productVariantPromotions } from "@/core/drizzledb/schema";
import { GetProductsDto } from "@/internal/commerce/product/dto/get-products.dto";
import {
  ProductWithLikesRaw,
  toProductListItem,
  type PaginatedProductsResponse,
} from "@/internal/commerce/product/product.mapper";
import { PaginatedResponseDto } from "@/shared/dto/paginated-response.dto";

export type {
  ProductWithLikesRaw,
  PaginatedProductsResponse,
} from "@/internal/commerce/product/product.mapper";

@Injectable()
export class FindAllProductsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(dto: GetProductsDto): Promise<PaginatedProductsResponse> {
    const { limit, skip } = dto;

    // Each product returns its default variant (guaranteed to exist). Variant
    // data replaces the soon-to-be-deprecated product-level fields.
    const [rows, totalRows] = await Promise.all([
      this.db
        .select({
          product: products,
          variantName: productVariants.name,
          variantSku: productVariants.sku,
          variantIsActive: productVariants.is_active,
          price: sql<string>`(
            SELECT COALESCE((
              SELECT vp.amount::text
              FROM commerce.product_variant_pricing vp
              WHERE vp.variant_id = ${productVariants.id}
                AND vp.is_active = true
              ORDER BY vp.effective_from DESC
              LIMIT 1
            ), '0')
          )`,
          stock: sql<number>`(
            SELECT COALESCE((
              SELECT vi.stock
              FROM commerce.product_variant_inventory vi
              WHERE vi.variant_id = ${productVariants.id}
              LIMIT 1
            ), 0)
          )`,
          image_url: sql<string>`(
            SELECT COALESCE((
              SELECT m.url
              FROM commerce.product_variant_media pvm
              JOIN content.media m ON m.id = pvm.media_id
              WHERE pvm.variant_id = ${productVariants.id}
                AND pvm.is_primary = true
                AND pvm.is_active = true
                AND m.deleted_at IS NULL
              ORDER BY pvm.sort_order ASC, pvm.id ASC
              LIMIT 1
            ), '')
          )`,
          percentage_off: sql<string | number>`
            COALESCE((
              SELECT pvp.discount_value::text
              FROM commerce.product_variant_promotions pvp
              WHERE pvp.variant_id = ${productVariants.id}
                AND pvp.is_active = true
                AND pvp.discount_type = 'percentage'
                AND pvp.effective_from <= now()
                AND (pvp.effective_to IS NULL OR pvp.effective_to >= now())
              ORDER BY pvp.effective_from DESC
              LIMIT 1
            ), '0')
          `,
          likes_count: sql<string | number>`
            (SELECT COALESCE(COUNT(w.id), 0)::int FROM commerce.wishlists w WHERE w.product_id = ${products.id})
          `,
        })
        .from(products)
        .innerJoin(
          productVariants,
          and(
            eq(productVariants.product_id, products.id),
            eq(productVariants.is_default, true),
            eq(productVariants.is_active, true),
          ),
        )
        .orderBy(desc(products.created_at))
        .offset(skip)
        .limit(limit),
      this.db.select({ total: count() }).from(products),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);

    return PaginatedResponseDto.from(
      rows.map((r) =>
        toProductListItem(
          r.product,
          {
            name: r.variantName,
            sku: r.variantSku,
            is_active: r.variantIsActive,
          },
          {
            price: r.price,
            stock: r.stock,
            image_url: r.image_url,
            percentage_off: r.percentage_off,
            likes_count: r.likes_count,
          },
        ),
      ),
      total,
      dto,
    );
  }
}
