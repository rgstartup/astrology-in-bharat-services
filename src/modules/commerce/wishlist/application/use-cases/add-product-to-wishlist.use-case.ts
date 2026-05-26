// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import {
  ProductAlreadyInWishlistError,
  ProductNotFoundError,
  UserNotFoundError,
} from '../../domain/errors/wishlist.errors';

@Injectable()
export class AddProductToWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(ProfileClient)
    private readonly profileClientRepo: Repository<ProfileClient>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async execute(userId: string, productId: string): Promise<Wishlist> {
    const client = await this.profileClientRepo.findOne({ where: { user: { id: userId } } });
    if (!client) {
      throw new UserNotFoundError();
    }

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    const existing = await this.wishlistRepository.findOne({
      where: { client: { id: client.id }, product: { id: product.id } },
    });

    if (existing) {
      throw new ProductAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client: client,
      product: product,
    });

    return await this.wishlistRepository.save(wishlist);
  }
}
