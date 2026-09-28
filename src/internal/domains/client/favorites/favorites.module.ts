import { Module } from '@nestjs/common';
import { FavoriteExpertController } from './controllers/expert.controller';
import { FavoriteProductController } from './controllers/product.controller';
import { FavoriteProductVariantController } from './controllers/product-variant.controller';
import { FavoritesService } from './favorites.service';
import { AddExpertToFavoritesUseCase } from './use-cases/add-expert-to-fovorites.usecase';
import { FindFavoriteExpertsUseCase } from './use-cases/find-all-favorite-experts.usecase';
import { RemoveExpertFromFavoritesUseCase } from './use-cases/remove-expert-from-favorites.usecase';
import { AddProductToFavoritesUseCase } from './use-cases/add-product-to-favorites.usecase';
import { FindFavoriteProductsUseCase } from './use-cases/find-all-favorite-products.usecase';
import { RemoveProductFromFavoritesUseCase } from './use-cases/remove-product-from-favorites.usecase';
import { AddProductVariantToFavoritesUseCase } from './use-cases/add-product-variant-to-favorites.usecase';
import { FindFavoriteProductVariantsUseCase } from './use-cases/find-all-favorite-product-variants.usecase';
import { RemoveProductVariantFromFavoritesUseCase } from './use-cases/remove-product-variant-from-favorites.usecase';

const usecases = [
  AddExpertToFavoritesUseCase,
  FindFavoriteExpertsUseCase,
  RemoveExpertFromFavoritesUseCase,
  AddProductToFavoritesUseCase,
  FindFavoriteProductsUseCase,
  RemoveProductFromFavoritesUseCase,
  AddProductVariantToFavoritesUseCase,
  FindFavoriteProductVariantsUseCase,
  RemoveProductVariantFromFavoritesUseCase,
];

@Module({
  imports: [],
  controllers: [
    FavoriteExpertController,
    FavoriteProductController,
    FavoriteProductVariantController,
  ],
  providers: [FavoritesService, ...usecases],
  exports: [FavoritesService],
})
export class FavoritesModule {}
