import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistService } from './application/services/wishlist.service';
import { ProductLikeController } from './interfaces/controllers/product-like.controller';
import { ExpertLikeController } from './interfaces/controllers/expert-like.controller';
import { Wishlist } from './domain/entities/wishlist.entity';
import { ProductModule } from '@/modules/product/product.module';
import { UsersModule } from '@/modules/users/users.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { IWishlistRepository } from './domain/repositories/wishlist.repository.interface';
import { TypeOrmWishlistRepository } from './infrastructure/persistence/typeorm-wishlist.repository';

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
