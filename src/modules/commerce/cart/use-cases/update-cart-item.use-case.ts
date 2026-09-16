import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '../entities/cart-item.entity';
import { UpdateCartItemDto } from '../dto/update-cart.dto';

@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
  ) {}

  async execute(clientId: number | string, updateCartItemDto: UpdateCartItemDto) {
    const { productId, quantity } = updateCartItemDto;

    const cartItem = await this.cartItemRepository
      .createQueryBuilder('cartItem')
      .innerJoin('cartItem.cart', 'cart')
      .innerJoin('cart.client', 'client')
      .where('client.id = :clientId', { clientId: Number(clientId) })
      .andWhere('cartItem.product_id = :productId', { productId: Number(productId) })
      .getOne();

    if (!cartItem) {
      throw new NotFoundException('Item not found in the cart');
    }

    if (quantity <= 0) {
      return this.cartItemRepository.remove(cartItem);
    }

    cartItem.quantity = quantity;

    return this.cartItemRepository.save(cartItem);
  }
}
