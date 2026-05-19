import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../infrastructure/entities/product.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Injectable()
export class FindAllProductsUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
  ) { }

  async execute(filters: { merchantId?: number; page?: number; limit?: number }) {
    const { merchantId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const query = this.productRepository.createQueryBuilder('product')
      .where('product.is_active = :isActive', { isActive: true });

    if (merchantId) {
      // Find the user_id associated with this merchant profile id
      const merchant = await this.merchantRepository.findOne({ where: { id: merchantId } });
      if (merchant) {
        query.andWhere('product.merchant_id = :userId', { userId: merchant.user_id });
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
      data: products.map(p => ({
        ...p,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : Number(p.price),
        imageUrl: p.image_url ?? '',
        percentageOff: p.percentage_off ?? 0,
        productName: p.name,
        productImage: p.image_url ?? ''
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
