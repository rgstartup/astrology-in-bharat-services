import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../infrastructure/entities/product.entity';
import { ProductNotFoundError } from '../../domain/errors/product.errors';

@Injectable()
export class RemoveProductUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(id: string): Promise<BooleanMessage> {
    const existing = await this.productRepository.findOneBy({ id });
    if (!existing) {
      throw new ProductNotFoundError(id);
    }
    await this.productRepository.delete(id);
    return new BooleanMessage();
  }
}
