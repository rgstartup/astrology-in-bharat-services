import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/persistence/entities/wishlist.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/persistence/entities/profile-merchant.entity';
import { FindUserUseCase } from '@/modules/users/application/use-cases/find-user.usecase';
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
    private readonly findUserUseCase: FindUserUseCase,
  ) {}

  async execute(userId: number, merchantId: number): Promise<Wishlist> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
    });
    if (!merchant) {
      throw new MerchantNotFoundError(merchantId);
    }

    let user;
    try {
      user = await this.findUserUseCase.findById(userId);
    } catch (e) {
      throw new UserNotFoundError();
    }

    const existing = await this.wishlistRepository.findOne({
      where: { user: { id: userId }, merchant: { id: merchantId } },
    });

    if (existing) {
      throw new MerchantAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      user,
      merchant,
    });

    return this.wishlistRepository.save(wishlist);
  }
}
