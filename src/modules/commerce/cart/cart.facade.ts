import { Injectable } from '@nestjs/common';
import { GetCartUseCase } from './use-cases/get-cart.use-case';
import { AddToCartUseCase } from './use-cases/add-to-cart.use-case';
import { UpdateCartItemUseCase } from './use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from './use-cases/remove-cart-item.use-case';
import { ClearCartUseCase } from './use-cases/clear-cart.use-case';
import { UpdateCartItemDto } from './dto/update-cart.dto';
import { AddToCartDto } from './dto/create-cart.dto';

@Injectable()
export class CartFacade {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addToCartUseCase: AddToCartUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  async getCart(clientId: string) {
    return this.getCartUseCase.execute(clientId);
  }

  async addToCart(clientId: string, addToCartDto: AddToCartDto) {
    return this.addToCartUseCase.execute(clientId, addToCartDto);
  }

  async updateCartItem(clientId: string, updateCartItemDto: UpdateCartItemDto) {
    return this.updateCartItemUseCase.execute(clientId, updateCartItemDto);
  }

  async removeCartItem(clientId: string, productId: string) {
    return this.removeCartItemUseCase.execute(clientId, productId);
  }

  async clearCart(clientId: string) {
    return this.clearCartUseCase.execute(clientId);
  }
}
