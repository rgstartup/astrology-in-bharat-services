import { Inject, Injectable } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { productCategories } from '@/core/drizzledb/schema';
import { CreateCategoryDto } from '@/internal/commerce/product-category/dto/create-category.dto';
import { CategorySlugExistsError, CategoryNameExistsError } from '@/internal/commerce/product-category/errors/category.errors';

@Injectable()
export class CreateCategoryUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(dto: CreateCategoryDto): Promise<any> {
    const existing = await this.db
      .select()
      .from(productCategories)
      .where(
        or(
          eq(productCategories.slug, dto.slug),
          eq(productCategories.name, dto.name),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const conflict = existing[0];
      if (conflict.slug === dto.slug) {
        throw new CategorySlugExistsError(dto.slug);
      }
      throw new CategoryNameExistsError(dto.name);
    }

    const [created] = await this.db
      .insert(productCategories)
      .values({
        name: dto.name,
        slug: dto.slug,
      })
      .returning();

    return created;
  }
}