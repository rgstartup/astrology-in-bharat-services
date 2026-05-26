import { Injectable } from '@nestjs/common';
import { GetCartUseCase } from './use-cases/get-cart.use-case';
import { AddToCartUseCase } from './use-cases/add-to-cart.use-case';
import { UpdateCartItemUseCase } from './use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from './use-cases/remove-cart-item.use-case';
import { ClearCartUseCase } from './use-cases/clear-cart.use-case';
import { AddToCartDto } from '../api/dto/create-cart.dto';
import { UpdateCartItemDto } from '../api/dto/update-cart.dto';

@Injectable()
export class CartFacade {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addToCartUseCase: AddToCartUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) { }

  async getCart(userId: string) {
    return this.getCartUseCase.execute(userId);
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    return this.addToCartUseCase.execute(userId, addToCartDto);
  }

  async updateCartItem(userId: string, updateCartItemDto: UpdateCartItemDto & { productId: string }) {
    return this.updateCartItemUseCase.execute(userId, updateCartItemDto);
  }

  async removeCartItem(userId: string, productId: string) {
    return this.removeCartItemUseCase.execute(userId, productId);
  }

  async clearCart(userId: string) {
    return this.clearCartUseCase.execute(userId);
  }
}
