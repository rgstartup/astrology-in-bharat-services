import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { GetProductsDto } from '../dto/get-products.dto';

export interface ProductWithLikesRaw {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string;
  short_description: string | null;
  price: number;
  original_price: number;
  image_url: string;
  product_image: string;
  gallery: string[] | null;
  stock: number;
  merchant_id: string | null;
  is_shipping_chargeable: boolean;
  shipping_charge: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  percentage_off: number;
  likes_count: number;
}

export interface PaginatedProductsResponse {
  success: boolean;
  data: ProductWithLikesRaw[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

@Injectable()
export class FindAllProductsUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(dto: GetProductsDto): Promise<PaginatedProductsResponse> {
    const { merchantId, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const query = this.productRepository
      .createQueryBuilder('product')
      .where('product.is_active = :isActive', { isActive: true });

    if (merchantId) {
      query.andWhere('product.merchant_id = :merchantId', {
        merchantId,
      });
    }

    // Select all fields directly and compute likes_count & percentage_off in the query
    query
      .select([
        'product.id AS id',
        'product.name AS name',
        'product.sku AS sku',
        'product.category AS category',
        'product.description AS description',
        'product.short_description AS short_description',
        'product.price::float AS price',
        'COALESCE(product.original_price, product.price)::float AS original_price',
        "COALESCE(product.image_url, '') AS image_url",
        "COALESCE(product.image_url, '') AS product_image",
        'product.gallery AS gallery',
        'product.stock AS stock',
        'product.merchant_id AS merchant_id',
        'product.is_shipping_chargeable AS is_shipping_chargeable',
        'product.shipping_charge::float AS shipping_charge',
        'product.is_active AS is_active',
        'product.created_at AS created_at',
        'product.updated_at AS updated_at',
      ])
      .addSelect(
        `CASE 
          WHEN product.original_price IS NOT NULL AND product.original_price > product.price 
          THEN ROUND(((product.original_price - product.price) / product.original_price) * 100)::int 
          ELSE 0 
        END`,
        'percentage_off',
      )
      .addSelect(
        `(SELECT COALESCE(COUNT(w.id), 0)::int FROM commerce.wishlists w WHERE w.product_id = product.id)`,
        'likes_count',
      );

    const [products, total] = await Promise.all([
      query
        .orderBy('product.created_at', 'DESC')
        .skip(skip)
        .take(limit)
        .getRawMany<ProductWithLikesRaw>(),
      query.getCount(),
    ]);

    return {
      success: true,
      data: products,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
