import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorites } from './entities/favorites.entity';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { Product } from '@/modules/commerce/product/entities/product.entity';
import { ProductVariant } from '@/modules/commerce/product/entities/variants.entity';
import { FavoriteExpertController } from './controllers/expert.controller';
import { FavoriteProductController } from './controllers/product.controller';
import { FavoriteProductVariantController } from './controllers/product-variant.controller';
import { FavoritesFacade } from './favorites.facade';
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
  imports: [
    TypeOrmModule.forFeature([
      Favorites,
      ExpertAccount,
      Product,
      ProductVariant,
    ]),
  ],
  controllers: [
    FavoriteExpertController,
    FavoriteProductController,
    FavoriteProductVariantController,
  ],
  providers: [FavoritesFacade, ...usecases],
  exports: [FavoritesFacade],
})
export class FavoritesModule {}
