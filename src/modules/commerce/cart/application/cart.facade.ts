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
  ) {}

  async getCart(profileId: string) {
    return this.getCartUseCase.execute(profileId);
  }

  async addToCart(profileId: string, addToCartDto: AddToCartDto) {
    return this.addToCartUseCase.execute(profileId, addToCartDto);
  }

  async updateCartItem(
    profileId: string,
    updateCartItemDto: UpdateCartItemDto & { productId: string },
  ) {
    return this.updateCartItemUseCase.execute(profileId, updateCartItemDto);
  }

  async removeCartItem(profileId: string, productId: string) {
    return this.removeCartItemUseCase.execute(profileId, productId);
  }

  async clearCart(profileId: string) {
    return this.clearCartUseCase.execute(profileId);
  }
}
