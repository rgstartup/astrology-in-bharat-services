// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../../infrastructure/entities/cart.entity';
import { CartItem } from '../../infrastructure/entities/cart-item.entity';
import { AddToCartDto } from '../../api/dto/create-cart.dto';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Injectable()
export class AddToCartUseCase {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProfileClient)
    private profileClientRepository: Repository<ProfileClient>,
  ) {}

  async execute(userId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let cart = await this.cartRepository.findOne({
      where: { client: { user: { id: userId } } },
      relations: ['items'],
    });

    if (!cart) {
      const client = await this.profileClientRepository.findOne({ where: { user: { id: userId } } });
      if (!client) {
        throw new NotFoundException('Client profile not found for user');
      }
      cart = this.cartRepository.create({ client });
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
      relations: ['items', 'items.product', 'client', 'client.user'],
    });
  }
}
