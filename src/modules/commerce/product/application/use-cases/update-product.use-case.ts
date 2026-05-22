// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../infrastructure/entities/product.entity';
import { UpdateProductDto } from '../../api/dto/update-product.dto';
import { ProductNotFoundError } from '../../domain/errors/product.errors';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(id: string, dto: UpdateProductDto): Promise<Product> {
    const existing = await this.productRepository.findOneBy({ id });
    if (!existing) {
      throw new ProductNotFoundError(id);
    }
    await this.productRepository.update(id, dto);
    return this.productRepository.findOneBy({ id }) as Promise<Product>;
  }
}
