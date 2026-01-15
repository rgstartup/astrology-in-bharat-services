import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistService } from './wishlist.service';
import { ProductLikeController } from './product-like.controller';
import { ExpertLikeController } from './expert-like.controller';
import { Wishlist } from './entities/wishlist.entity';
import { Product } from '@/modules/product/entities/product.entity';
import { User } from '@/modules/users/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Wishlist, Product, User, ProfileExpert])],
    controllers: [ProductLikeController, ExpertLikeController],
    providers: [WishlistService],
})
export class WishlistModule { }
