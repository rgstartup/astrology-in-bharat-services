import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { productCategories, ProductCategoryRow } from "@/core/drizzledb/schema";
import { GetCategoriesDto } from "@/internal/commerce/product-category/dto/get-categories.dto";
import { PaginatedResponseDto } from "@/shared/dto/paginated-response.dto";

@Injectable()
export class FindAllCategoriesUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(dto: GetCategoriesDto) {
    const { limit, skip, search, is_active, sort_by, sort_order } = dto;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(productCategories.name, `%${search}%`),
          ilike(productCategories.slug, `%${search}%`),
        ),
      );
    }

    if (is_active !== undefined) {
      // We don't have is_active column in current schema, but keeping for future
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      productCategories[sort_by ?? "created_at"] ??
      productCategories.created_at;
    const orderBy =
      sort_order === "ASC" ? sql`${sortColumn} ASC` : sql`${sortColumn} DESC`;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(productCategories)
        .where(where)
        .orderBy(orderBy)
        .offset(skip)
        .limit(limit),
      this.db.select({ total: count() }).from(productCategories).where(where),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);

    return PaginatedResponseDto.from<ProductCategoryRow>(rows, total, dto);
  }
}
