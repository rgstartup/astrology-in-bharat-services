import { Inject, Injectable } from '@nestjs/common';
import { and, eq, or, ne } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { productCategories } from '@/core/drizzledb/schema';
import { UpdateCategoryDto } from '@/internal/commerce/product-category/dto/update-category.dto';
import { CategoryNotFoundError, CategorySlugExistsError, CategoryNameExistsError } from '@/internal/commerce/product-category/errors/category.errors';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number, dto: UpdateCategoryDto): Promise<any> {
    const existing = await this.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, Number(id)))
      .limit(1);

    if (!existing.length) {
      throw new CategoryNotFoundError(id);
    }

    if (dto.slug || dto.name) {
      const conflict = await this.db
        .select()
        .from(productCategories)
        .where(
          and(
            or(
              dto.slug ? eq(productCategories.slug, dto.slug) : undefined,
              dto.name ? eq(productCategories.name, dto.name) : undefined,
            ),
            ne(productCategories.id, Number(id)),
          ) as any,
        )
        .limit(1);

      if (conflict.length > 0) {
        const c = conflict[0];
        if (dto.slug && c.slug === dto.slug) {
          throw new CategorySlugExistsError(dto.slug);
        }
        if (dto.name && c.name === dto.name) {
          throw new CategoryNameExistsError(dto.name);
        }
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.slug) updateData.slug = dto.slug;
    // Note: current schema only has name and slug

    if (Object.keys(updateData).length === 0) {
      return existing[0];
    }

    const [updated] = await this.db
      .update(productCategories)
      .set(updateData)
      .where(eq(productCategories.id, Number(id)))
      .returning();

    return updated;
  }
}