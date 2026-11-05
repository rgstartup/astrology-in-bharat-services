import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { productCategories } from '@/core/drizzledb/schema';
import { CategoryNotFoundError } from '@/internal/commerce/product-category/errors/category.errors';

@Injectable()
export class RemoveCategoryUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number): Promise<void> {
    const existing = await this.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, Number(id)))
      .limit(1);

    if (!existing.length) {
      throw new CategoryNotFoundError(id);
    }

    await this.db
      .delete(productCategories)
      .where(eq(productCategories.id, Number(id)));
  }
}