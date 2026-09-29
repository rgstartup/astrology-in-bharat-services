import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { products } from '@/core/drizzledb/schema';
import { ProductNotFoundError } from '@/internal/commerce/product/errors/product.errors';
import { toProductDetails } from '@/internal/commerce/product/product.mapper';

@Injectable()
export class FindProductUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number): Promise<any> {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, Number(id)))
      .limit(1);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return toProductDetails(product);
  }
}
