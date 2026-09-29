import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { products } from '@/core/drizzledb/schema';
import { CreateMerchantProductDto } from '@/internal/actors/merchant/dashboard/dto/create-merchant-product.dto';
import { MerchantProductStatus } from '@/internal/actors/merchant/dashboard/enum';
import { toMerchantProductResponse } from '@/internal/commerce/product/product.mapper';

@Injectable()
export class MerchantProductsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  // 1. LIST with filters + pagination
  async findAll(
    merchantId: number,
    opts: { status?: string; search?: string; page?: number; limit?: number },
  ) {
    const { status, search, page = 1, limit = 20 } = opts;
    const mId = Number(merchantId);

    const conditions = [eq(products.merchant_id, mId)];

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(products.name, pattern),
          sql`CAST(${products.id} AS text) LIKE ${pattern}`,
          ilike(products.sku, pattern),
        )!,
      );
    }

    if (status) {
      if (status === 'out_of_stock') {
        conditions.push(eq(products.stock, 0));
      } else if (status === 'active') {
        conditions.push(eq(products.is_active, true));
        conditions.push(sql`${products.stock} > 0`);
      } else if (status === 'draft') {
        conditions.push(eq(products.is_active, false));
        conditions.push(sql`${products.stock} > 0`);
      }
    }

    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(products)
        .where(where)
        .orderBy(desc(products.created_at))
        .offset((page - 1) * limit)
        .limit(limit),
      this.db.select({ total: count() }).from(products).where(where),
    ]);

    return {
      products: rows.map((p) => toMerchantProductResponse(p)),
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  // 2. CREATE
  async create(merchantId: number, dto: CreateMerchantProductDto) {
    const isActive = dto.status === MerchantProductStatus.ACTIVE;
    const [saved] = await this.db
      .insert(products)
      .values({
        name: dto.name,
        description: dto.description,
        category: dto.category,
        sku: dto.sku ?? null,
        price: String(dto.price),
        original_price:
          dto.original_price != null
            ? String(dto.original_price)
            : String(dto.price),
        image_url: dto.image_url ?? dto.imageUrl ?? null,
        gallery: dto.gallery ? dto.gallery.join(',') : null,
        stock: dto.stock ?? 0,
        is_active: isActive,
        merchant_id: Number(merchantId),
        is_shipping_chargeable: dto.is_shipping_chargeable ?? false,
        shipping_charge:
          dto.shipping_charge != null ? String(dto.shipping_charge) : '0',
        percentage_off: '0',
      })
      .returning();
    return toMerchantProductResponse(saved);
  }

  // 3. UPDATE
  async update(
    merchantId: number,
    productId: number,
    dto: Partial<CreateMerchantProductDto>,
  ) {
    const [existing] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, Number(productId)))
      .limit(1);
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.merchant_id !== Number(merchantId)) {
      throw new ForbiddenException('You do not own this product');
    }

    const updates: Partial<typeof products.$inferInsert> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.sku !== undefined) updates.sku = dto.sku;
    if (dto.price !== undefined) updates.price = String(dto.price);
    if (dto.original_price !== undefined)
      updates.original_price = String(dto.original_price);
    if (dto.image_url !== undefined) updates.image_url = dto.image_url;
    else if ((dto as { imageUrl?: string }).imageUrl !== undefined)
      updates.image_url = (dto as { imageUrl?: string }).imageUrl;
    if (dto.gallery !== undefined) updates.gallery = dto.gallery.join(',');
    if (dto.stock !== undefined) updates.stock = dto.stock;
    if (dto.status !== undefined) {
      updates.is_active = dto.status === MerchantProductStatus.ACTIVE;
    }
    if (dto.is_shipping_chargeable !== undefined)
      updates.is_shipping_chargeable = dto.is_shipping_chargeable;
    if (dto.shipping_charge !== undefined)
      updates.shipping_charge = String(dto.shipping_charge);

    await this.db
      .update(products)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(products.id, Number(productId)));
    const [updated] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, Number(productId)))
      .limit(1);
    return toMerchantProductResponse(updated!);
  }

  // 4. DELETE
  async remove(merchantId: number, productId: number) {
    const [existing] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, Number(productId)))
      .limit(1);
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.merchant_id !== Number(merchantId)) {
      throw new ForbiddenException('You do not own this product');
    }
    await this.db.delete(products).where(eq(products.id, Number(productId)));
    return { success: true, message: 'Product deleted successfully' };
  }

  // 5. BULK STATUS UPDATE
  async bulkUpdateStatus(
    merchantId: number,
    ids: number[],
    status: MerchantProductStatus,
  ) {
    // Ensure all products belong to the merchant
    const [row] = await this.db
      .select({ total: count() })
      .from(products)
      .where(
        and(
          inArray(products.id, ids.map(Number)),
          eq(products.merchant_id, Number(merchantId)),
        ),
      );
    if (Number(row?.total ?? 0) !== ids.length) {
      throw new ForbiddenException('Some products do not belong to you');
    }

    const isActive = status === MerchantProductStatus.ACTIVE;
    await this.db
      .update(products)
      .set({ is_active: isActive, updated_at: new Date() })
      .where(inArray(products.id, ids.map(Number)));

    return {
      success: true,
      message: `${ids.length} products updated to ${status}`,
    };
  }

  // 6. FIND ONE
  async findOne(merchantId: number, productId: number) {
    const [p] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, Number(productId)))
      .limit(1);
    if (!p) throw new NotFoundException('Product not found');
    if (p.merchant_id !== Number(merchantId)) {
      throw new ForbiddenException('You do not own this product');
    }
    return toMerchantProductResponse(p);
  }

  // 7. STOCK LEVELS
  async getMerchantStockLevels(merchantId: number) {
    const stockResult = await this.db
      .select({ name: products.name, stock: products.stock })
      .from(products)
      .where(eq(products.merchant_id, Number(merchantId)))
      .orderBy(asc(products.stock))
      .limit(10);

    return stockResult.map((p) => ({
      name: p.name,
      stock: Number(p.stock),
      status:
        Number(p.stock) > 10
          ? 'Healthy'
          : Number(p.stock) > 0
            ? 'Low Stock'
            : 'Out of Stock',
    }));
  }
}
