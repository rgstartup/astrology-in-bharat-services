import { Injectable } from '@nestjs/common';
import { AddExpertToFavoritesUseCase } from './use-cases/add-expert-to-fovorites.usecase';
import { FindFavoriteExpertsUseCase } from './use-cases/find-all-favorite-experts.usecase';
import { RemoveExpertFromFavoritesUseCase } from './use-cases/remove-expert-from-favorites.usecase';
import { FindFavoriteExpertsDto } from './dto/favorite-expert.dto';
import { AddProductToFavoritesUseCase } from './use-cases/add-product-to-favorites.usecase';
import { FindFavoriteProductsUseCase } from './use-cases/find-all-favorite-products.usecase';
import { RemoveProductFromFavoritesUseCase } from './use-cases/remove-product-from-favorites.usecase';
import { FindFavoriteProductsDto } from './dto/favorite-product.dto';
import { AddProductVariantToFavoritesUseCase } from './use-cases/add-product-variant-to-favorites.usecase';
import { FindFavoriteProductVariantsUseCase } from './use-cases/find-all-favorite-product-variants.usecase';
import { RemoveProductVariantFromFavoritesUseCase } from './use-cases/remove-product-variant-from-favorites.usecase';
import { FindFavoriteProductVariantsDto } from './dto/favorite-product-variant.dto';

@Injectable()
export class FavoritesFacade {
  constructor(
    private readonly addExpertToFavoritesUseCase: AddExpertToFavoritesUseCase,
    private readonly findFavoriteExpertsUseCase: FindFavoriteExpertsUseCase,
    private readonly removeExpertFromFavoritesUseCase: RemoveExpertFromFavoritesUseCase,
    private readonly addProductToFavoritesUseCase: AddProductToFavoritesUseCase,
    private readonly findFavoriteProductsUseCase: FindFavoriteProductsUseCase,
    private readonly removeProductFromFavoritesUseCase: RemoveProductFromFavoritesUseCase,
    private readonly addProductVariantToFavoritesUseCase: AddProductVariantToFavoritesUseCase,
    private readonly findFavoriteProductVariantsUseCase: FindFavoriteProductVariantsUseCase,
    private readonly removeProductVariantFromFavoritesUseCase: RemoveProductVariantFromFavoritesUseCase,
  ) {}

  // Expert Favorites
  async findFavoriteExperts(clientId: number, query?: FindFavoriteExpertsDto) {
    return this.findFavoriteExpertsUseCase.execute(clientId, query);
  }

  async addExpertToFavorites(clientId: number, expertId: number) {
    return this.addExpertToFavoritesUseCase.execute(clientId, expertId);
  }

  async removeExpertFromFavorites(clientId: number, expertId: number) {
    return this.removeExpertFromFavoritesUseCase.execute(clientId, expertId);
  }

  // Product Favorites
  async findFavoriteProducts(
    clientId: number,
    query?: FindFavoriteProductsDto,
  ) {
    return this.findFavoriteProductsUseCase.execute(clientId, query);
  }

  async addProductToFavorites(clientId: number, productId: number) {
    return this.addProductToFavoritesUseCase.execute(clientId, productId);
  }

  async removeProductFromFavorites(clientId: number, productId: number) {
    return this.removeProductFromFavoritesUseCase.execute(clientId, productId);
  }

  // Product Variant Favorites
  async findFavoriteProductVariants(
    clientId: number,
    query?: FindFavoriteProductVariantsDto,
  ) {
    return this.findFavoriteProductVariantsUseCase.execute(clientId, query);
  }

  async addProductVariantToFavorites(clientId: number, variantId: number) {
    return this.addProductVariantToFavoritesUseCase.execute(
      clientId,
      variantId,
    );
  }

  async removeProductVariantFromFavorites(clientId: number, variantId: number) {
    return this.removeProductVariantFromFavoritesUseCase.execute(
      clientId,
      variantId,
    );
  }
}
