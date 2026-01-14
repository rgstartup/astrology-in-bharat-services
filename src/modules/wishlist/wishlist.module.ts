import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { Wishlist } from './entities/wishlist.entity';
import { Product } from '@/modules/product/entities/product.entity';
import { User } from '@/modules/users/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Wishlist, Product, User])],
    controllers: [WishlistController],
    providers: [WishlistService],
})
export class WishlistModule { }
