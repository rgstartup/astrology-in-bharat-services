import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductLikeController } from './controllers/product-like.controller';
import { ExpertLikeController } from './controllers/expert-like.controller';
import { PujaLikeController } from './controllers/puja-like.controller';
import { Wishlist } from './entities/wishlist.entity';
import { Product } from '@/modules/commerce/product/entities/product.entity';
import { User } from '@/modules/users/entities/user.entity';
import { UsersModule } from '@/modules/users/users.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { WishlistFacade } from './wishlist.facade';
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
import { MerchantLikeController } from './controllers/merchant-like.controller';
import { AccountModule } from '@/modules/client/account/account.module';
import { MerchantAccountModule } from '@/modules/merchant/account/account.module';
import { ProfileModule as ExpertProfileModule } from '@/modules/expert/profile/profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wishlist, Product, User]),
    AccountModule,
    MerchantAccountModule,
    ExpertProfileModule,
    UsersModule,
    ExpertModule,
  ],
  controllers: [
    ProductLikeController,
    ExpertLikeController,
    PujaLikeController,
    MerchantLikeController,
  ],
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
    AddMerchantToWishlistUseCase,
    RemoveMerchantFromWishlistUseCase,
    GetMerchantWishlistUseCase,
  ],
})
export class WishlistModule {}
