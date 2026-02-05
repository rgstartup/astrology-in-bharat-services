import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './interfaces/controllers/cart.controller';
import { CartService } from './application/services/cart.service';
import { Cart } from './domain/entities/cart.entity';
import { CartItem } from './domain/entities/cart-item.entity';
import { Product } from '@/modules/product';
import { User } from '@/modules/users';
import { ICartRepository } from './domain/repositories/cart.repository.interface';
import { TypeOrmCartRepository } from './infrastructure/persistence/typeorm-cart.repository';

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

