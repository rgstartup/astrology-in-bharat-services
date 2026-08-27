import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../entities/cart.entity';

@Injectable()
export class GetCartUseCase {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
  ) {}

  async execute(clientId: string) {
    const cart = await this.cartRepository.findOne({
      where: { client: { id: clientId } },
      relations: ['items', 'items.product', 'client', 'client.user'],
    });

    if (!cart) {
      return { items: [] };
    }

    return cart;
  }
}
