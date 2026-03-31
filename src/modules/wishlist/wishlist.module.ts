import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductLikeController } from './api/controllers/product-like.controller';
import { ExpertLikeController } from './api/controllers/expert-like.controller';
import { PujaLikeController } from './api/controllers/puja-like.controller';
import { Wishlist } from './infrastructure/persistence/entities/wishlist.entity';
import { Product } from '@/modules/product/infrastructure/persistence/entities/product.entity';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/persistence/entities/expert-puja.entity';

import { UsersModule } from '../users/users.module';
import { ExpertModule } from '../expert/expert.module';
import { WishlistFacade } from './application/wishlist.facade';
import { AddProductToWishlistUseCase } from './application/use-cases/add-product-to-wishlist.use-case';
import { RemoveProductFromWishlistUseCase } from './application/use-cases/remove-product-from-wishlist.use-case';
import { GetProductWishlistUseCase } from './application/use-cases/get-product-wishlist.use-case';
import { AddExpertToWishlistUseCase } from './application/use-cases/add-expert-to-wishlist.use-case';
import { RemoveExpertFromWishlistUseCase } from './application/use-cases/remove-expert-from-wishlist.use-case';
import { GetExpertWishlistUseCase } from './application/use-cases/get-expert-wishlist.use-case';
import { AddPujaToWishlistUseCase } from './application/use-cases/add-puja-to-wishlist.use-case';
import { RemovePujaFromWishlistUseCase } from './application/use-cases/remove-puja-from-wishlist.use-case';
import { GetPujaWishlistUseCase } from './application/use-cases/get-puja-wishlist.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wishlist, Product, ExpertPuja]),
    UsersModule,
    ExpertModule,
  ],
  controllers: [ProductLikeController, ExpertLikeController, PujaLikeController],

  providers: [
    WishlistFacade,
    AddProductToWishlistUseCase,
    RemoveProductFromWishlistUseCase,
    GetProductWishlistUseCase,
    AddExpertToWishlistUseCase,
    RemoveExpertFromWishlistUseCase,
    GetExpertWishlistUseCase,
    AddPujaToWishlistUseCase,
    RemovePujaFromWishlistUseCase,
    GetPujaWishlistUseCase,
  ],

})
export class WishlistModule {}
