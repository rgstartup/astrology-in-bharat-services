import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../../infrastructure/entities/cart.entity';
import { CartItem } from '../../infrastructure/entities/cart-item.entity';

@Injectable()
export class ClearCartUseCase {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
  ) {}

  async execute(profileId: string): Promise<void> {
    const cart = await this.cartRepo.findOne({
      where: { client_id: profileId },
      relations: ['items'],
    });

    if (cart && cart.items.length > 0) {
      await this.cartItemRepo.remove(cart.items);
    }
  }
}
