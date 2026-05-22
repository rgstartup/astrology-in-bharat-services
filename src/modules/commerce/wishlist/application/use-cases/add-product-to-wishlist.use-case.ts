// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { FindUserUseCase } from '@/modules/users/application/use-cases/find-user.usecase';
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
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly findUserUseCase: FindUserUseCase,
  ) {}

  async execute(userId: number, productId: number): Promise<Wishlist> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new ProductNotFoundError();
    }

    let user;
    try {
      user = await this.findUserUseCase.findById(userId);
    } catch (e) {
      throw new UserNotFoundError();
    }

    const existing = await this.wishlistRepository.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });

    if (existing) {
      throw new ProductAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      user,
      product,
    });

    return this.wishlistRepository.save(wishlist);
  }
}
