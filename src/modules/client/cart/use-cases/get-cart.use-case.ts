import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '@/modules/commerce/cart/entities/cart.entity';

@Injectable()
export class GetCartUseCase {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
  ) {}

  async execute(clientId: number | string) {
    const cart = await this.cartRepository.findOne({
      where: { client: { id: Number(clientId) } },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      return { items: [] };
    }

    return cart;
  }
}
