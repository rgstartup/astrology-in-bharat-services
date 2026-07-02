import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../infrastructure/entities/product.entity';
import { MerchantProfileFacade } from '@/modules/merchant/profile/application/profile.facade';

@Injectable()
export class FindAllProductsUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly merchantFacade: MerchantProfileFacade,
  ) {}

  async execute(filters: {
    merchantId?: string;
    page?: number;
    limit?: number;
  }) {
    const { merchantId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const query = this.productRepository
      .createQueryBuilder('product')
      .where('product.is_active = :isActive', { isActive: true });

    if (merchantId) {
      // Find the client_id associated with this merchant profile id
      const merchant = await this.merchantFacade.getProfileById(merchantId);
      if (merchant) {
        query.andWhere('product.merchant_id = :userId', {
          userId: merchant.user_id,
        });
      } else {
        // If merchant not found, we shouldn't return any products for this merchantId
        return {
          success: true,
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
    }

    const [products, total] = await query
      .orderBy('product.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      success: true,
      data: products.map((p) => ({
        ...p,
        price: Number(p.price),
        original_price: p.original_price
          ? Number(p.original_price)
          : Number(p.price),
        image_url: p.image_url ?? '',
        percentage_off: p.percentage_off ?? 0,
        product_name: p.name,
        product_image: p.image_url ?? '',
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
