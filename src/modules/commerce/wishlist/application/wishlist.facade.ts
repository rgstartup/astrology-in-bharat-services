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

  async getProductWishlist(userId: string) {
    return this.getProductWishlistUseCase.execute(userId);
  }

  async addProductToWishlist(userId: string, productId: string) {
    return this.addProductUseCase.execute(userId, productId);
  }

  async removeProductFromWishlist(userId: string, productId: string) {
    return this.removeProductUseCase.execute(userId, productId);
  }

  async getExpertWishlist(userId: string) {
    return this.getExpertWishlistUseCase.execute(userId);
  }

  async addExpertToWishlist(userId: string, expertId: string) {
    return this.addExpertUseCase.execute(userId, expertId);
  }

  async removeExpertFromWishlist(userId: string, expertId: string) {
    return this.removeExpertUseCase.execute(userId, expertId);
  }

  async getPujaWishlist(userId: string) {
    return this.getPujaWishlistUseCase.execute(userId);
  }

  async addPujaToWishlist(userId: string, pujaId: string) {
    return this.addPujaUseCase.execute(userId, pujaId);
  }

  async removePujaFromWishlist(userId: string, pujaId: string) {
    return this.removePujaUseCase.execute(userId, pujaId);
  }

  async getMerchantWishlist(userId: string) {
    return this.getMerchantWishlistUseCase.execute(userId);
  }

  async addMerchantToWishlist(userId: string, merchantId: string) {
    return this.addMerchantUseCase.execute(userId, merchantId);
  }

  async removeMerchantFromWishlist(userId: string, merchantId: string) {
    return this.removeMerchantUseCase.execute(userId, merchantId);
  }
}
