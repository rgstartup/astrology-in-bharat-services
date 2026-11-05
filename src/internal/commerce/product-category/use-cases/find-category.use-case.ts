import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { productCategories } from '@/core/drizzledb/schema';
import { CategoryNotFoundError } from '@/internal/commerce/product-category/errors/category.errors';

@Injectable()
export class FindCategoryUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number): Promise<any> {
    const [category] = await this.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, Number(id)))
      .limit(1);

    if (!category) {
      throw new CategoryNotFoundError(id);
    }

    return category;
  }
}