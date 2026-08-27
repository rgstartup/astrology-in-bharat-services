import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../entities/cart.entity';

@Injectable()
export class ClearCartUseCase {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
  ) {}

  async execute(clientId: string): Promise<void> {
    const result = await this.cartRepo.delete({
      client: { id: clientId },
    });

    if (result.affected === 0) {
      throw new NotFoundException('Cart not found');
    }
  }
}
