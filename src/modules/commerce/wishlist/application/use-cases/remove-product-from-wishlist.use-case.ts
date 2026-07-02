import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import {
  ProductNotInWishlistError,
  UserNotFoundError,
} from '../../domain/errors/wishlist.errors';

@Injectable()
export class RemoveProductFromWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(profileId: string, productId: string): Promise<BooleanMessage> {
    if (!profileId) {
      throw new UserNotFoundError();
    }

    const result = await this.wishlistRepository.delete({
      client_id: profileId,
      product: { id: productId },
    });

    if (result.affected === 0) {
      throw new ProductNotInWishlistError();
    }
    return new BooleanMessage();
  }
}
