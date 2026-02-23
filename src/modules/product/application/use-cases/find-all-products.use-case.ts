import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../infrastructure/persistence/entities/product.entity';

@Injectable()
export class FindAllProductsUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) { }

  async execute(): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .select([
        'product.id',
        'product.name',
        'product.description',
        'product.price',
        'product.original_price',
        'product.image_url',
        'product.is_active',
      ])
      .where('product.is_active = :isActive', { isActive: true })
      .getMany();
  }
}
