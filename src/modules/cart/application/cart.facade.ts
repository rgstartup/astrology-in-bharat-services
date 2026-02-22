import { Injectable } from '@nestjs/common';
import { GetCartUseCase } from './use-cases/get-cart.use-case';
import { AddToCartUseCase } from './use-cases/add-to-cart.use-case';
import { UpdateCartItemUseCase } from './use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from './use-cases/remove-cart-item.use-case';
import { AddToCartDto } from '../api/dto/create-cart.dto';
import { UpdateCartItemDto } from '../api/dto/update-cart.dto';

@Injectable()
export class CartFacade {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addToCartUseCase: AddToCartUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
  ) {}

  async getCart(userId: number) {
    return this.getCartUseCase.execute(userId);
  }

  async addToCart(userId: number, addToCartDto: AddToCartDto) {
    return this.addToCartUseCase.execute(userId, addToCartDto);
  }

  async updateCartItem(userId: number, updateCartItemDto: UpdateCartItemDto & { productId: number }) {
    return this.updateCartItemUseCase.execute(userId, updateCartItemDto);
  }

  async removeCartItem(userId: number, productId: number) {
    return this.removeCartItemUseCase.execute(userId, productId);
  }
}
