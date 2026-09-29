import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { products } from '@/core/drizzledb/schema';
import { ProductGroup, ProductType } from '@/internal/commerce/product/enum';
import { CreateProductDto } from '@/internal/commerce/product/dto/create-product.dto';
import { toProductDetails } from '@/internal/commerce/product/product.mapper';
import { Product } from '@/internal/commerce/product/entities/product.entity';

@Injectable()
export class CreateProductUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(dto: CreateProductDto): Promise<Product> {
    const [saved] = await this.db
      .insert(products)
      .values({
        name: dto.name,
        description: dto.description,
        type: dto.type ?? ProductType.GOODS,
        product_group: dto.product_group ?? ProductGroup.ITEM,
        price: String(dto.price),
        original_price:
          dto.original_price != null
            ? String(dto.original_price)
            : String(dto.price),
        stock: dto.stock ?? 0,
        image_url: dto.image_url ?? dto.imageUrl ?? null,
        short_description: dto.short_description ?? null,
        category: dto.category ?? null,
        gallery: dto.gallery ? dto.gallery.join(',') : null,
        is_active: dto.is_active ?? false,
        is_shipping_chargeable: dto.is_shipping_chargeable ?? false,
        shipping_charge:
          dto.shipping_charge != null ? String(dto.shipping_charge) : '0',
        percentage_off: '0',
      })
      .returning();
    return toProductDetails(saved) as unknown as Product;
  }
}
