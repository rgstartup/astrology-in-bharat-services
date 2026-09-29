import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { products } from '@/core/drizzledb/schema';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';
import { ProductNotFoundError } from '@/internal/commerce/product/errors/product.errors';

@Injectable()
export class RemoveProductUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number): Promise<BooleanMessage> {
    const [existing] = await this.db
      .delete(products)
      .where(eq(products.id, Number(id)))
      .returning({ id: products.id });

    if (!existing) {
      throw new ProductNotFoundError(id);
    }

    return new BooleanMessage(true, 'Product has been removed successfully');
  }
}
