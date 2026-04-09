import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/persistence/entities/wishlist.entity';
import { MerchantNotInWishlistError } from '../../domain/errors/wishlist.errors';

@Injectable()
export class RemoveMerchantFromWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(userId: number, merchantId: number): Promise<void> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { user: { id: userId }, merchant: { id: merchantId } },
    });

    if (!wishlist) {
      throw new MerchantNotInWishlistError();
    }

    await this.wishlistRepository.delete(wishlist.id);
  }
}
