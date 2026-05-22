// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../../infrastructure/entities/cart.entity';
import { CartItem } from '../../infrastructure/entities/cart-item.entity';
import { AddToCartDto } from '../../api/dto/create-cart.dto';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class AddToCartUseCase {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async execute(userId: number, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['items'],
    });

    if (!cart) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      cart = this.cartRepository.create({ user });
      await this.cartRepository.save(cart);
    }

    let cartItem = await this.cartItemRepository.findOne({
      where: { cart: { id: cart.id }, product: { id: productId } },
    });

    if (cartItem) {
      cartItem.quantity += quantity;
      await this.cartItemRepository.save(cartItem);
    } else {
      cartItem = this.cartItemRepository.create({
        cart,
        product,
        quantity,
      });
      await this.cartItemRepository.save(cartItem);
    }

    // Return the updated cart
    return this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product'],
    });
  }
}
