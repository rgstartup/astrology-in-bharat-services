import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '../entities/cart-item.entity';

@Injectable()
export class RemoveCartItemUseCase {
  constructor(
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
  ) {}

  async execute(clientId: string, productId: string) {
    const cartItem = await this.cartItemRepository
      .createQueryBuilder('cartItem')
      .innerJoin('cartItem.cart', 'cart')
      .innerJoin('cart.client', 'client')
      .where('client.id = :clientId', { clientId })
      .andWhere('cartItem.product_id = :productId', { productId })
      .getOne();

    if (!cartItem) {
      throw new NotFoundException('Item not found in the cart');
    }

    return this.cartItemRepository.remove(cartItem);
  }
}
