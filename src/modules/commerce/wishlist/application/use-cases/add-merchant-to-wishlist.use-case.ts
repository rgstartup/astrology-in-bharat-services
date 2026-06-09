
import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { MerchantProfileFacade } from '@/modules/merchant/profile/application/profile.facade';
import { ClientProfileFacade } from '@/modules/client/profile/application/profile.facade';
import {
  MerchantAlreadyInWishlistError,
  MerchantNotFoundError,
  UserNotFoundError,
} from '../../domain/errors/wishlist.errors';

@Injectable()
export class AddMerchantToWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly merchantProfileFacade: MerchantProfileFacade,
    private readonly clientProfileFacade: ClientProfileFacade,
  ) {}

  async execute(userId: string, merchantId: string): Promise<BooleanMessage> {
    const merchant = await this.merchantProfileFacade.getProfileById(merchantId);
    if (!merchant) {
      throw new MerchantNotFoundError(merchantId);
    }

    const client = await this.clientProfileFacade.getProfile(userId);
    if (!client) {
      throw new UserNotFoundError();
    }

    const existing = await this.wishlistRepository.findOne({
      where: { client: { id: client.id }, merchant: { id: merchantId } },
    });

    if (existing) {
      throw new MerchantAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client,
      merchant,
    });

    await this.wishlistRepository.save(wishlist);
    return new BooleanMessage();
  }
}
