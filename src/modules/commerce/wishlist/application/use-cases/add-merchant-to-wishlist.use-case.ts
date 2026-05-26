// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
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
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
    @InjectRepository(ProfileClient)
    private readonly profileClientRepo: Repository<ProfileClient>,
  ) {}

  async execute(userId: string, merchantId: string): Promise<Wishlist> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
    });
    if (!merchant) {
      throw new MerchantNotFoundError(merchantId);
    }

    const client = await this.profileClientRepo.findOne({ where: { user: { id: userId } } });
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

    return this.wishlistRepository.save(wishlist);
  }
}
