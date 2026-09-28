import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../entities/wishlist.entity';

@Injectable()
export class GetMerchantWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(profileId: number) {
    const wishlistItems = await this.wishlistRepository.find({
      where: { client_id: profileId },
      relations: ['merchant', 'merchant.user'],
      order: { created_at: 'DESC' },
    });

    // Filter only those that have a merchant (in case of mixed wishlist table)
    const merchants = wishlistItems
      .filter((item) => item.merchant != null)
      .map((item) => {
        const m = item.merchant!;
        return {
          id: m.id,
          name: m.shop_name || m.name || m.user?.name || 'Unnamed Shop',
          image: m.avatar || m.user?.avatar || '',
          address: m.address || '',
          city: m.city || '',
          rating: Number(m.rating) || 0,
          reviewCount: m.review_count || 0,
          isTrusted: m.is_trusted || false,
          isLiked: true, // It's in the wishlist, so it's liked
        };
      });

    return {
      success: true,
      data: merchants,
    };
  }
}
