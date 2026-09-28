import { Module } from '@nestjs/common';
import { CartController } from './controllers/cart.controller';
import { CartService } from './cart.service';
import { GetCartUseCase } from './use-cases/get-cart.use-case';
import { AddToCartUseCase } from './use-cases/add-to-cart.use-case';
import { UpdateCartItemUseCase } from './use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from './use-cases/remove-cart-item.use-case';
import { ClearCartUseCase } from './use-cases/clear-cart.use-case';
import { AccountModule } from '@/internal/domains/client/account/account.module';

@Module({
  imports: [AccountModule],
  controllers: [CartController],
  providers: [
    CartService,
    GetCartUseCase,
    AddToCartUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,
  ],
  exports: [CartService],
})
export class CartModule {}
