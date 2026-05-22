// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../../infrastructure/entities/cart.entity';
import { CartItem } from '../../infrastructure/entities/cart-item.entity';

@Injectable()
export class RemoveCartItemUseCase {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
  ) {}

  async execute(userId: number, productId: number) {
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const cartItem = await this.cartItemRepository.findOne({
      where: { cart: { id: cart.id }, product: { id: productId } },
    });

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.cartItemRepository.remove(cartItem);

    // Return updated cart
    return this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product'],
    });
  }
}
