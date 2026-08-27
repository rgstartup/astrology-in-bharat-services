import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CartController } from './controllers/cart.controller';
import { CartFacade } from './cart.facade';
import { GetCartUseCase } from './use-cases/get-cart.use-case';
import { AddToCartUseCase } from './use-cases/add-to-cart.use-case';
import { UpdateCartItemUseCase } from './use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from './use-cases/remove-cart-item.use-case';
import { ClearCartUseCase } from './use-cases/clear-cart.use-case';
import { Product } from '@/modules/client/commerce/product/infrastructure/entities/product.entity';
import { AccountModule } from '@/modules/client/account/account.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Product]), AccountModule],
  controllers: [CartController],
  providers: [
    CartFacade,
    GetCartUseCase,
    AddToCartUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,
  ],
  exports: [CartFacade],
})
export class CartModule {}
