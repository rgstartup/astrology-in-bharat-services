
import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ClientProfileFacade } from '@/modules/client/profile/application/profile.facade';
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
    private readonly clientProfileFacade: ClientProfileFacade,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async execute(userId: string, productId: string): Promise<BooleanMessage> {
    const client = await this.clientProfileFacade.getProfile(userId);
    if (!client) {
      throw new UserNotFoundError();
    }

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    const existing = await this.wishlistRepository.findOne({
      where: { client: { id: client.id }, product: { id: productId } },
    });

    if (existing) {
      throw new ProductAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client,
      product,
    });

    await this.wishlistRepository.save(wishlist);
    return new BooleanMessage();
  }
}
