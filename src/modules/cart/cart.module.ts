import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './infrastructure/persistence/entities/cart.entity';
import { CartItem } from './infrastructure/persistence/entities/cart-item.entity';
import { CartController } from './api/controllers/cart.controller';
import { CartFacade } from './application/cart.facade';
import { GetCartUseCase } from './application/use-cases/get-cart.use-case';
import { AddToCartUseCase } from './application/use-cases/add-to-cart.use-case';
import { UpdateCartItemUseCase } from './application/use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from './application/use-cases/remove-cart-item.use-case';
import { Product } from '@/modules/product/entities/product.entity';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, Product, User]),
  ],
  controllers: [CartController],
  providers: [
    CartFacade,
    GetCartUseCase,
    AddToCartUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
  ],
  exports: [CartFacade],
})
export class CartModule {}
