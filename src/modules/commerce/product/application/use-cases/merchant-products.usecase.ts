import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from '../../infrastructure/entities/product.entity';
import {
  CreateMerchantProductDto,
  MerchantProductStatus,
} from '@/modules/merchant/dashboard/api/dto/create-merchant-product.dto';

type ProductStatus = 'active' | 'draft' | 'out_of_stock';

@Injectable()
export class MerchantProductsUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // Helper: map DB fields to API response shape
  private toResponse(p: Product) {
    let status: ProductStatus = 'draft';
    if (p.stock === 0) {
      status = 'out_of_stock';
    } else if (p.is_active) {
      status = 'active';
    }

    return {
      id: p.id,
      name: p.name,
      productName: p.name,
      category: p.category ?? 'General',
      sku: p.sku ?? undefined,
      price: Number(p.price),
      stock: p.stock,
      status,
      image_url: p.image_url ?? '',
      imageUrl: p.image_url ?? '',
      productImage: p.image_url ?? '',
      gallery: p.gallery ?? [],
      description: p.description,
      original_price: Number(p.original_price ?? p.price),
      created_at: p.created_at,
    };
  }

  // 1. LIST with filters + pagination
  async findAll(
    merchantId: string,
    opts: { status?: string; search?: string; page?: number; limit?: number },
  ) {
    const { status, search, page = 1, limit = 20 } = opts;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.merchant_id = :merchantId', { merchantId })
      .orderBy('p.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('LOWER(p.name) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    if (status) {
      if (status === 'out_of_stock') {
        qb.andWhere('p.stock = 0');
      } else if (status === 'active') {
        qb.andWhere('p.is_active = true AND p.stock > 0');
      } else if (status === 'draft') {
        qb.andWhere('p.is_active = false AND p.stock > 0');
      }
    }

    const [products, total] = await qb.getManyAndCount();
    return {
      products: products.map((p: Product) => this.toResponse(p)),
      total,
    };
  }

  // 2. CREATE
  async create(merchantId: string, dto: CreateMerchantProductDto) {
    const isActive = dto.status === MerchantProductStatus.ACTIVE;
    const product = this.productRepo.create({
      ...dto,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      sku: dto.sku,
      price: dto.price,
      original_price: dto.original_price,
      image_url: dto.image_url ?? (dto as any).imageUrl,
      gallery: dto.gallery ?? [],
      stock: dto.stock ?? 0,
      is_active: isActive,
      merchant_id: merchantId,
    });
    const saved = await this.productRepo.save(product);
    return this.toResponse(saved);
  }

  // 3. UPDATE
  async update(
    merchantId: string,
    productId: string,
    dto: Partial<CreateMerchantProductDto>,
  ) {
    const existing = await this.productRepo.findOneBy({
      id: productId as unknown as string,
    });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.merchant_id !== merchantId) {
      throw new ForbiddenException('You do not own this product');
    }

    const updates: Partial<Product> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.sku !== undefined) updates.sku = dto.sku;
    if (dto.price !== undefined) updates.price = dto.price;
    if (dto.original_price !== undefined)
      updates.original_price = dto.original_price;
    if (dto.image_url !== undefined) updates.image_url = dto.image_url;
    else if ((dto as any).imageUrl !== undefined) updates.image_url = (dto as any).imageUrl;
    if (dto.gallery !== undefined) updates.gallery = dto.gallery;
    if (dto.stock !== undefined) updates.stock = dto.stock;
    if (dto.status !== undefined) {
      updates.is_active = dto.status === MerchantProductStatus.ACTIVE;
    }

    await this.productRepo.update(productId, updates);
    const updated = await this.productRepo.findOneBy({
      id: productId as unknown as string,
    });
    return this.toResponse(updated!);
  }

  // 4. DELETE
  async remove(merchantId: string, productId: string) {
    const existing = await this.productRepo.findOneBy({
      id: productId as unknown as string,
    });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.merchant_id !== merchantId) {
      throw new ForbiddenException('You do not own this product');
    }
    await this.productRepo.delete(productId);
    return { success: true, message: 'Product deleted successfully' };
  }

  // 5. BULK STATUS UPDATE
  async bulkUpdateStatus(
    merchantId: string,
    ids: string[],
    status: MerchantProductStatus,
  ) {
    // Ensure all products belong to the merchant
    const count = await this.productRepo.count({
      where: { id: In(ids), merchant_id: merchantId },
    });
    if (count !== ids.length) {
      throw new ForbiddenException('Some products do not belong to you');
    }

    const isActive = status === MerchantProductStatus.ACTIVE;
    await this.productRepo.update({ id: In(ids) }, { is_active: isActive });

    return {
      success: true,
      message: `${ids.length} products updated to ${status}`,
    };
  }

  // 6. FIND ONE
  async findOne(merchantId: string, productId: string) {
    const p = await this.productRepo.findOneBy({
      id: productId as unknown as string,
    });
    if (!p) throw new NotFoundException('Product not found');
    if (p.merchant_id !== merchantId) {
      throw new ForbiddenException('You do not own this product');
    }
    return this.toResponse(p);
  }

  // 7. STOCK LEVELS
  async getMerchantStockLevels(merchantId: string) {
    const stockResult: Array<{ name: string; stock: string }> =
      await this.productRepo.query(
        `
        SELECT name, stock 
        FROM commerce.products 
        WHERE merchant_id = $1
        ORDER BY stock ASC
        LIMIT 10
    `,
        [merchantId],
      );

    return stockResult.map((p) => ({
      name: p.name,
      stock: Number(p.stock),
      status:
        Number(p.stock) > 10 ? 'Healthy' : Number(p.stock) > 0 ? 'Low Stock' : 'Out of Stock',
    }));
  }
}
