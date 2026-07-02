import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../infrastructure/entities/product.entity';
import { ProductNotFoundError } from '../../domain/errors/product.errors';

@Injectable()
export class FindProductUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(id: string): Promise<any> {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return {
      ...product,
      price: Number(product.price),
      original_price: product.original_price
        ? Number(product.original_price)
        : Number(product.price),
      image_url: product.image_url ?? '',
      percentage_off: product.percentage_off ?? 0,
    };
  }
}
