import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddToCartDto } from './dto/create-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart.dto';
import { Product } from '@/modules/product/entities/product.entity';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class CartService {
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

  async getCart(userId: number) {
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
    });

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

    return this.getCart(userId);
  }

  async updateCartItem(
    userId: number,
    // productId/cartItemId needs careful handling.
    // The requirement says DELETE /api/v1/cart/remove/:id
    // But update is PUT /api/v1/cart/update (Quantity change)
    // usually implies sending product ID in body or url.
    // I'll assume we need to update based on productId for consistency with 'Add' logic usually.
    // But let's check the DTO. DTO has quantity.
    // I'll make the controller take productId as a query param or part of body?
    // The requirement: PUT /api/v1/cart/update (Quantity change)
    // It doesn't specify params. Usually body will contain productId + quantity.
    // Let's assume BODY contains productId and quantity?
    // Wait, the DTO `UpdateCartItemDto` I created only has quantity.
    // I probably need productId there too or pass it in URL.
    // Since the requirement says "ADD (Product add karne ke liye)", "UPDATE (Quantity change karne ke liye)"
    // it's cleaner to have productId in the DTO for update too if the URL is generic /update.
    // IF the URL was /update/:productId, then DTO only needs quantity.
    // The user said: PUT /api/v1/cart/update
    // So the productId MUST be in the body.

    // REDESIGN ON THE FLY: Update UpdateCartItemDto to include productId.
    updateCartItemDto: UpdateCartItemDto & { productId: number },
  ) {
    const { productId, quantity } = updateCartItemDto;

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

    if (quantity <= 0) {
      await this.cartItemRepository.remove(cartItem);
    } else {
      cartItem.quantity = quantity;
      await this.cartItemRepository.save(cartItem);
    }

    return this.getCart(userId);
  }

  async removeCartItem(userId: number, productId: number) {
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

    return this.getCart(userId);
  }
}
