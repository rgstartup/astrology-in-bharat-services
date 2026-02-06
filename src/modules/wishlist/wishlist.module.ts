import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertModule } from '@/modules/expert/expert.module';
import { ProductModule } from '@/modules/product/product.module';
import { UsersModule } from '@/modules/users/users.module';
import { WishlistService } from './application/services/wishlist.service';
import { Wishlist } from './domain/entities/wishlist.entity';
import { IWishlistRepository } from './domain/repositories/wishlist.repository.interface';
import { TypeOrmWishlistRepository } from './infrastructure/persistence/typeorm-wishlist.repository';
import { ExpertLikeController } from './interfaces/controllers/expert-like.controller';
import { ProductLikeController } from './interfaces/controllers/product-like.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wishlist]),
    ProductModule,
    UsersModule,
    ExpertModule,
  ],
  controllers: [ProductLikeController, ExpertLikeController],
  providers: [
    WishlistService,
    {
      provide: IWishlistRepository,
      useClass: TypeOrmWishlistRepository,
    },
  ],
  exports: [WishlistService, IWishlistRepository],
})
export class WishlistModule { }
