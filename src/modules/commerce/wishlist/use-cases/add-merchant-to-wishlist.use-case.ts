import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../entities/wishlist.entity';
import { MerchantAccountFacade } from '@/modules/merchant/account/account.facade';
import {
  MerchantAlreadyInWishlistError,
  MerchantNotFoundError,
  UserNotFoundError,
} from '../domain/errors/wishlist.errors';

@Injectable()
export class AddMerchantToWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly merchantAccountFacade: MerchantAccountFacade,
  ) {}

  async execute(
    profileId: number,
    merchantId: number,
  ): Promise<BooleanMessage> {
    const merchant =
      await this.merchantAccountFacade.getAccountById(merchantId);
    if (!merchant) {
      throw new MerchantNotFoundError(merchantId);
    }

    if (!profileId) {
      throw new UserNotFoundError();
    }

    const existing = await this.wishlistRepository.findOne({
      where: { client_id: profileId, merchant: { id: merchantId } },
    });

    if (existing) {
      throw new MerchantAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client_id: profileId,
      merchant,
    });

    await this.wishlistRepository.save(wishlist);
    return new BooleanMessage();
  }
}
