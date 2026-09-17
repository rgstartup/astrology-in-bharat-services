import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpertProducts } from '../entities/expert-product.entity';
import { GetExpertProductsDto } from '../dto/get-expert-products.dto';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';

@Injectable()
export class FindExpertProductsUseCase {
  constructor(
    @InjectRepository(ExpertProducts)
    private readonly expertProductRepository: Repository<ExpertProducts>,
  ) {}

  async execute(expertId: number, dto: GetExpertProductsDto) {
    const query = this.expertProductRepository
      .createQueryBuilder('ep')
      .innerJoin('ep.product', 'product')
      .leftJoin('product.categories', 'category')
      .leftJoin('product.variants', 'variant')
      .leftJoin('variant.inventory', 'inventory')
      .leftJoin('variant.fulfillment', 'fulfillment')
      .leftJoin('variant.pricing', 'pricing')
      .leftJoin('variant.promotions', 'promotion')
      .leftJoin('product.media', 'product_media')
      .leftJoin('product_media.media', 'media')
      .where('ep.expert_id = :expertId', { expertId });

    // Explicitly select only non-deprecated product fields and variant sub-entities
    query.select([
      // ExpertProduct relation metadata
      'ep.id',
      'ep.expert_id',
      'ep.product_id',
      'ep.relation_type',

      // Product (non-deprecated columns only)
      'product.id',
      'product.name',
      'product.description',
      'product.type',
      'product.product_group',
      'product.merchant_id',
      'product.created_at',
      'product.updated_at',

      // Category
      'category.id',
      'category.name',
      'category.slug',
      'category.created_at',
      'category.updated_at',

      // Variant
      'variant.id',
      'variant.product_id',
      'variant.name',
      'variant.sku',
      'variant.attributes',
      'variant.description',
      'variant.is_default',
      'variant.is_active',
      'variant.sort_order',
      'variant.created_at',
      'variant.updated_at',

      // Variant Inventory
      'inventory.id',
      'inventory.variant_id',
      'inventory.stock',
      'inventory.reserved_stock',
      'inventory.created_at',
      'inventory.updated_at',

      // Variant Fulfillment
      'fulfillment.id',
      'fulfillment.variant_id',
      'fulfillment.fulfillment_type',
      'fulfillment.delivery_type',
      'fulfillment.shipping_fee',
      'fulfillment.processing_time',
      'fulfillment.estimated_delivery_min',
      'fulfillment.estimated_delivery_max',
      'fulfillment.is_active',
      'fulfillment.created_at',
      'fulfillment.updated_at',

      // Variant Pricing
      'pricing.id',
      'pricing.variant_id',
      'pricing.amount',
      'pricing.currency',
      'pricing.target_audience',
      'pricing.status',
      'pricing.is_active',
      'pricing.effective_from',
      'pricing.effective_to',

      // Variant Promotions
      'promotion.id',
      'promotion.variant_id',
      'promotion.name',
      'promotion.description',
      'promotion.discount_type',
      'promotion.discount_value',
      'promotion.target_audience',
      'promotion.is_active',
      'promotion.effective_from',
      'promotion.effective_to',

      // Product & Variant Media
      'product_media.id',
      'product_media.product_id',
      'product_media.variant_id',
      'product_media.media_id',
      'product_media.media_role',
      'product_media.is_primary',
      'product_media.is_active',
      'product_media.sort_order',
      'media.id',
      'media.url',
      'media.file_name',
      'media.mime_type',
      'media.alt_text',
    ]);

    if (dto.search && dto.search.trim()) {
      const searchPattern = `%${dto.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(product.name) LIKE :search OR LOWER(product.description) LIKE :search OR LOWER(variant.name) LIKE :search OR LOWER(variant.sku) LIKE :search)',
        { search: searchPattern },
      );
    }

    if (dto.type) {
      query.andWhere('product.type = :type', { type: dto.type });
    }

    if (dto.product_group) {
      query.andWhere('product.product_group = :productGroup', {
        productGroup: dto.product_group,
      });
    }

    if (dto.relation_type) {
      query.andWhere('ep.relation_type = :relationType', {
        relationType: dto.relation_type,
      });
    }

    if (dto.category && dto.category.trim()) {
      const categoryTerm = dto.category.trim().toLowerCase();
      query.andWhere(
        '(LOWER(category.slug) = :cat OR LOWER(category.name) = :cat)',
        { cat: categoryTerm },
      );
    }

    if (dto.is_active !== undefined) {
      query.andWhere('variant.is_active = :isActive', {
        isActive: dto.is_active,
      });
    }

    const sortBy = dto.sort_by || 'created_at';
    const orderDirection = (dto.order || 'DESC').toUpperCase() as 'ASC' | 'DESC';

    if (sortBy === 'name') {
      query.orderBy('product.name', orderDirection);
    } else {
      query.orderBy('product.created_at', orderDirection);
    }

    query.skip(dto.offset).take(dto.limit);

    const [items, total] = await query.getManyAndCount();

    return PaginatedResponseDto.from(items, total, dto);
  }
}
