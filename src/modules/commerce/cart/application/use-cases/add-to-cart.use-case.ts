import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../../infrastructure/entities/cart.entity';
import { CartItem } from '../../infrastructure/entities/cart-item.entity';
import { AddToCartDto } from '../../api/dto/create-cart.dto';
import { Product } from '../../../product/infrastructure/entities/product.entity';

@Injectable()
export class AddToCartUseCase {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(profileId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const queryRunner = this.cartRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let cart = await queryRunner.manager.findOne(Cart, {
        where: { client_id: profileId },
        relations: ['items'],
      });

      if (!cart) {
        cart = queryRunner.manager.create(Cart, { client_id: profileId });
        await queryRunner.manager.save(Cart, cart);
      }

      let cartItem = await queryRunner.manager.findOne(CartItem, {
        where: { cart: { id: cart.id }, product: { id: productId } },
      });

      if (cartItem) {
        cartItem.quantity += quantity;
        await queryRunner.manager.save(CartItem, cartItem);
      } else {
        cartItem = queryRunner.manager.create(CartItem, {
          cart,
          product,
          quantity,
        });
        await queryRunner.manager.save(CartItem, cartItem);
      }

      await queryRunner.commitTransaction();

      // Return the updated cart
      return this.cartRepository.findOne({
        where: { id: cart.id },
        relations: ['items', 'items.product', 'client', 'client.user'],
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
