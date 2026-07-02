import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
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
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async execute(profileId: string, productId: string): Promise<BooleanMessage> {
    if (!profileId) {
      throw new UserNotFoundError();
    }

    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    const existing = await this.wishlistRepository.findOne({
      where: { client_id: profileId, product: { id: productId } },
    });

    if (existing) {
      throw new ProductAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client_id: profileId,
      product,
    });

    await this.wishlistRepository.save(wishlist);
    return new BooleanMessage();
  }
}
