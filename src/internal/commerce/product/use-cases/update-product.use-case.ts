import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { products } from '@/core/drizzledb/schema';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';
import { UpdateProductDto } from '@/internal/commerce/product/dto/update-product.dto';
import { ProductNotFoundError } from '@/internal/commerce/product/errors/product.errors';

@Injectable()
export class UpdateProductUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number, dto: UpdateProductDto): Promise<BooleanMessage> {
    const [existing] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, Number(id)))
      .limit(1);
    if (!existing) {
      throw new ProductNotFoundError(id);
    }

    // Build update payload mapping DTO fields to snake_case columns
    const updatePayload: Partial<typeof products.$inferInsert> = {};

    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.description !== undefined)
      updatePayload.description = dto.description;
    if (dto.price !== undefined) updatePayload.price = String(dto.price);
    if (dto.original_price !== undefined)
      updatePayload.original_price = String(dto.original_price);
    if (dto.stock !== undefined) updatePayload.stock = dto.stock;
    if (dto.category !== undefined) updatePayload.category = dto.category;
    // 'status' from frontend ('active'/'draft') maps to is_active boolean
    if (dto.status !== undefined)
      updatePayload.is_active = dto.status === 'active';
    if (dto.is_active !== undefined) updatePayload.is_active = dto.is_active;
    if (dto.gallery !== undefined)
      updatePayload.gallery = dto.gallery.join(',');
    if (dto.short_description !== undefined)
      updatePayload.short_description = dto.short_description;
    if (dto.is_shipping_chargeable !== undefined)
      updatePayload.is_shipping_chargeable = dto.is_shipping_chargeable;
    if (dto.shipping_charge !== undefined)
      updatePayload.shipping_charge = String(dto.shipping_charge);

    // imageUrl from frontend maps to image_url column
    const imageUrl = (dto as { imageUrl?: string }).imageUrl ?? dto.image_url;
    if (imageUrl !== undefined) updatePayload.image_url = imageUrl;

    await this.db
      .update(products)
      .set({ ...updatePayload, updated_at: new Date() })
      .where(eq(products.id, Number(id)));
    return new BooleanMessage();
  }
}
