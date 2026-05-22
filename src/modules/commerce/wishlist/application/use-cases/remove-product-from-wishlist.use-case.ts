// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ProductNotInWishlistError } from '../../domain/errors/wishlist.errors';

@Injectable()
export class RemoveProductFromWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(userId: number, productId: number): Promise<{ message: string }> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });

    if (!wishlist) {
      throw new ProductNotInWishlistError();
    }

    await this.wishlistRepository.remove(wishlist);
    return { message: 'Product removed from wishlist' };
  }
}
