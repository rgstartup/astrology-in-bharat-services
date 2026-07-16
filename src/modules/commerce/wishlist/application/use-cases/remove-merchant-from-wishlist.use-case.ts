import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import {
  MerchantNotInWishlistError,
  UserNotFoundError,
} from '../../domain/errors/wishlist.errors';

@Injectable()
export class RemoveMerchantFromWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(
    profileId: string,
    merchantId: string,
  ): Promise<BooleanMessage> {
    if (!profileId) {
      throw new UserNotFoundError();
    }

    const result = await this.wishlistRepository.delete({
      client_id: profileId,
      merchant: { id: merchantId },
    });

    if (result.affected === 0) {
      throw new MerchantNotInWishlistError();
    }
    return new BooleanMessage();
  }
}
