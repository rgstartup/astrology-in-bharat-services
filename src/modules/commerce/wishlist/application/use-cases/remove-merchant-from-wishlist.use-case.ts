// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { MerchantNotInWishlistError } from '../../domain/errors/wishlist.errors';

@Injectable()
export class RemoveMerchantFromWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(userId: string, merchantId: string): Promise<void> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { client: { user: { id: userId } }, merchant: { id: merchantId } },
    });

    if (!wishlist) {
      throw new MerchantNotInWishlistError();
    }

    await this.wishlistRepository.delete(wishlist.id);
  }
}
