import { Injectable } from '@nestjs/common';
import { AddProductToWishlistUseCase } from './use-cases/add-product-to-wishlist.use-case';
import { RemoveProductFromWishlistUseCase } from './use-cases/remove-product-from-wishlist.use-case';
import { GetProductWishlistUseCase } from './use-cases/get-product-wishlist.use-case';
import { AddExpertToWishlistUseCase } from './use-cases/add-expert-to-wishlist.use-case';
import { RemoveExpertFromWishlistUseCase } from './use-cases/remove-expert-from-wishlist.use-case';
import { GetExpertWishlistUseCase } from './use-cases/get-expert-wishlist.use-case';
import { AddPujaToWishlistUseCase } from './use-cases/add-puja-to-wishlist.use-case';
import { RemovePujaFromWishlistUseCase } from './use-cases/remove-puja-from-wishlist.use-case';
import { GetPujaWishlistUseCase } from './use-cases/get-puja-wishlist.use-case';
import { AddMerchantToWishlistUseCase } from './use-cases/add-merchant-to-wishlist.use-case';
import { RemoveMerchantFromWishlistUseCase } from './use-cases/remove-merchant-from-wishlist.use-case';
import { GetMerchantWishlistUseCase } from './use-cases/get-merchant-wishlist.use-case';

@Injectable()
export class WishlistFacade {
  constructor(
    private readonly addProductUseCase: AddProductToWishlistUseCase,
    private readonly removeProductUseCase: RemoveProductFromWishlistUseCase,
    private readonly getProductWishlistUseCase: GetProductWishlistUseCase,
    private readonly addExpertUseCase: AddExpertToWishlistUseCase,
    private readonly removeExpertUseCase: RemoveExpertFromWishlistUseCase,
    private readonly getExpertWishlistUseCase: GetExpertWishlistUseCase,
    private readonly addPujaUseCase: AddPujaToWishlistUseCase,
    private readonly removePujaUseCase: RemovePujaFromWishlistUseCase,
    private readonly getPujaWishlistUseCase: GetPujaWishlistUseCase,
    private readonly addMerchantUseCase: AddMerchantToWishlistUseCase,
    private readonly removeMerchantUseCase: RemoveMerchantFromWishlistUseCase,
    private readonly getMerchantWishlistUseCase: GetMerchantWishlistUseCase,
  ) {}

  async getProductWishlist(profileId: string) {
    return this.getProductWishlistUseCase.execute(profileId);
  }

  async addProductToWishlist(profileId: string, productId: string) {
    return this.addProductUseCase.execute(profileId, productId);
  }

  async removeProductFromWishlist(profileId: string, productId: string) {
    return this.removeProductUseCase.execute(profileId, productId);
  }

  async getExpertWishlist(profileId: string) {
    return this.getExpertWishlistUseCase.execute(profileId);
  }

  async addExpertToWishlist(profileId: string, expert_id: string) {
    return this.addExpertUseCase.execute(profileId, expert_id);
  }

  async removeExpertFromWishlist(profileId: string, expert_id: string) {
    return this.removeExpertUseCase.execute(profileId, expert_id);
  }

  async getPujaWishlist(profileId: string) {
    return this.getPujaWishlistUseCase.execute(profileId);
  }

  async addPujaToWishlist(profileId: string, pujaId: string) {
    return this.addPujaUseCase.execute(profileId, pujaId);
  }

  async removePujaFromWishlist(profileId: string, pujaId: string) {
    return this.removePujaUseCase.execute(profileId, pujaId);
  }

  async getMerchantWishlist(profileId: string) {
    return this.getMerchantWishlistUseCase.execute(profileId);
  }

  async addMerchantToWishlist(profileId: string, merchantId: string) {
    return this.addMerchantUseCase.execute(profileId, merchantId);
  }

  async removeMerchantFromWishlist(profileId: string, merchantId: string) {
    return this.removeMerchantUseCase.execute(profileId, merchantId);
  }
}
