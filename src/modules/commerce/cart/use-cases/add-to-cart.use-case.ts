import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';
import { AddToCartDto } from '../dto/create-cart.dto';
import { Product } from '../../product/entities/product.entity';
import { DatabaseService } from '@/core/database/database.service';

@Injectable()
export class AddToCartUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly db: DatabaseService,
  ) {}

  async execute(clientId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.db.transaction(async (queryRunner) => {
      const cart = await this.findOrCreateCart(queryRunner, clientId);
      return this.addCartItem(queryRunner, cart.id, product.id, quantity);
    });
  }

  private async findOrCreateCart(
    queryRunner: QueryRunner,
    clientId: string,
  ): Promise<Cart> {
    const cartRepo = queryRunner.manager.getRepository(Cart);

    const existingCart = await cartRepo.findOne({
      where: { client: { id: clientId } },
    });

    if (existingCart) return existingCart;

    const newCart = cartRepo.create({
      client: { id: clientId },
    });

    return cartRepo.save(newCart);
  }

  private async addCartItem(
    queryRunner: QueryRunner,
    cartId: string,
    productId: string,
    quantity: number,
  ) {
    const cartItemRepo = queryRunner.manager.getRepository(CartItem);

    const existingCartItem = await cartItemRepo.findOne({
      where: { cart: { id: cartId }, product: { id: productId } },
    });

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      return cartItemRepo.save(existingCartItem);
    }

    const newCartItem = cartItemRepo.create({
      cart: { id: cartId },
      product: { id: productId },
      quantity,
    });
    return cartItemRepo.save(newCartItem);
  }
}
