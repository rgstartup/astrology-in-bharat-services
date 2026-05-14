import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant } from '../../infrastructure/entities/profile-merchant.entity';
import { Wishlist } from '@/modules/commerce/wishlist/infrastructure/entities/wishlist.entity';

@Injectable()
export class GetMerchantDetailsUseCase {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(id: number, currentUserId?: number) {
    const merchant = await this.merchantRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!merchant) {
      throw new NotFoundException({
        success: false,
        message: 'Store not found',
        error: 'ERR_NOT_FOUND',
      });
    }

    // Fetch top 4 active product image URLs for this merchant using its user_id
    const productsRaw: { image_url: string }[] =
      await this.merchantRepository.manager.query(
        `
        SELECT image_url
        FROM commerce.products
        WHERE merchant_id = $1
          AND is_active = true
          AND image_url IS NOT NULL
          AND image_url <> ''
        ORDER BY created_at DESC
        LIMIT 4
      `,
        [merchant.user_id],
      );

    const popularProducts = productsRaw.map((p) => p.image_url);

    // Check if the merchant is liked by the current user
    let isLiked = false;
    if (currentUserId) {
      const wishlistEntry = await this.wishlistRepository.findOne({
        where: { user: { id: currentUserId }, merchant: { id: merchant.id } },
      });
      isLiked = !!wishlistEntry;
    }

    // Fetch likesCount using Repository count() for safe column mapping
    const likesCount = await this.wishlistRepository.count({
      where: { merchant: { id } },
    });

    return {
      id: merchant.id,
      name: merchant.shopName || merchant.user?.name || 'Unnamed Shop',
      image: merchant.user?.avatar || '',
      address: merchant.address || '',
      city: merchant.city || '',
      pincode: merchant.pincode || '',
      phone: merchant.phone || merchant.user?.email || '',
      email: merchant.user?.email || '',
      rating: merchant.rating ? Number(merchant.rating) : 0,
      reviewCount: merchant.reviewCount || 0,
      established: merchant.established || '',
      description: merchant.description || '',
      isTrusted: merchant.isTrusted || false,
      gallery: merchant.gallery || [],
      features: merchant.features || [],
      popularProducts: popularProducts,
      isLiked: isLiked,
      likesCount: likesCount,
      isOnline: merchant.isOnline,
      operationalHours: merchant.operationalHours,
      trustScore: merchant.trustScore,
      latitude: merchant.latitude,
      longitude: merchant.longitude,
    };
  }
}
