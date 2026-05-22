// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';

@Injectable()
export class GetMerchantWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(userId: number) {
    const wishlistItems = await this.wishlistRepository.find({
      where: { user: { id: userId } },
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
          name: m.shopName || m.client?.name || 'Unnamed Shop',
          image: m.client?.avatar || '',
          address: m.address || '',
          city: m.city || '',
          rating: Number(m.rating) || 0,
          reviewCount: m.reviewCount || 0,
          isTrusted: m.isTrusted || false,
          isLiked: true, // It's in the wishlist, so it's liked
        };
      });

    return {
      success: true,
      data: merchants,
    };
  }
}
