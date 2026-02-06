import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '@/modules/cart/domain/entities/cart.entity';
import { Product } from '@/modules/product/domain/entities/product.entity';
import { User } from '@/modules/users/domain/entities/user.entity';
import { CartItem } from '../../domain/entities/cart-item.entity';
import { ICartRepository } from '../../domain/repositories/cart.repository.interface';
import { AddToCartDto } from '../dtos/create-cart.dto';
import { UpdateCartItemDto } from '../dtos/update-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @Inject(ICartRepository)
    private readonly cartRepository: ICartRepository,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async getCart(userId: number) {
    const cart = await this.cartRepository.findByUserId(userId);

    if (!cart) {
      return { items: [] };
    }

    return cart;
  }

  async addToCart(userId: number, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let cart = await this.cartRepository.findByUserId(userId);

    if (!cart) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      cart = this.cartRepository.create({ user });
      await this.cartRepository.save(cart);
    }

    let cartItem = await this.cartRepository.findItem(cart.id, productId);

    if (cartItem) {
      cartItem.quantity += quantity;
      await this.cartRepository.saveItem(cartItem);
    } else {
      cartItem = this.cartRepository.createItem({
        cart,
        product,
        quantity,
      });
      await this.cartRepository.saveItem(cartItem);
    }

    return this.getCart(userId);
  }

  async updateCartItem(
    userId: number,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const { productId, quantity } = updateCartItemDto;

    const cart = await this.cartRepository.findByUserId(userId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const cartItem = await this.cartRepository.findItem(cart.id, productId);

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    if (quantity <= 0) {
      await this.cartRepository.removeItem(cartItem);
    } else {
      cartItem.quantity = quantity;
      await this.cartRepository.saveItem(cartItem);
    }

    return this.getCart(userId);
  }

  async removeCartItem(userId: number, productId: number) {
    const cart = await this.cartRepository.findByUserId(userId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const cartItem = await this.cartRepository.findItem(cart.id, productId);

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.cartRepository.removeItem(cartItem);

    return this.getCart(userId);
  }
}

