import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '@/modules/product/domain/entities/product.entity';
import { User } from '@/modules/users/domain/entities/user.entity';
import { CartService } from './application/services/cart.service';
import { CartItem } from './domain/entities/cart-item.entity';
import { Cart } from './domain/entities/cart.entity';
import { ICartRepository } from './domain/repositories/cart.repository.interface';
import { TypeOrmCartRepository } from './infrastructure/persistence/typeorm-cart.repository';
import { CartController } from './interfaces/controllers/cart.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Product, User])],
  controllers: [CartController],
  providers: [
    CartService,
    {
      provide: ICartRepository,
      useClass: TypeOrmCartRepository,
    },
  ],
  exports: [CartService],
})
export class CartModule { }

