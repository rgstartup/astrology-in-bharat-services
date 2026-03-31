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
  ) {}

  async getProductWishlist(userId: number) {
    return this.getProductWishlistUseCase.execute(userId);
  }

  async addProductToWishlist(userId: number, productId: number) {
    return this.addProductUseCase.execute(userId, productId);
  }

  async removeProductFromWishlist(userId: number, productId: number) {
    return this.removeProductUseCase.execute(userId, productId);
  }

  async getExpertWishlist(userId: number) {
    return this.getExpertWishlistUseCase.execute(userId);
  }

  async addExpertToWishlist(userId: number, expertId: number) {
    return this.addExpertUseCase.execute(userId, expertId);
  }

  async removeExpertFromWishlist(userId: number, expertId: number) {
    return this.removeExpertUseCase.execute(userId, expertId);
  }

  async getPujaWishlist(userId: number) {
    return this.getPujaWishlistUseCase.execute(userId);
  }

  async addPujaToWishlist(userId: number, pujaId: number) {
    return this.addPujaUseCase.execute(userId, pujaId);
  }

  async removePujaFromWishlist(userId: number, pujaId: number) {
    return this.removePujaUseCase.execute(userId, pujaId);
  }
}
