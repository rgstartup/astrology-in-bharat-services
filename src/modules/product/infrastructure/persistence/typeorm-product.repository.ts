import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../domain/entities/product.entity';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';

@Injectable()
export class TypeOrmProductRepository implements IProductRepository {
    constructor(
        @InjectRepository(Product)
        private readonly repository: Repository<Product>,
    ) { }

    create(data: Partial<Product>): Product {
        return this.repository.create(data);
    }

    async save(product: Product): Promise<Product> {
        return this.repository.save(product);
    }

    async findAllActive(): Promise<Product[]> {
        return this.repository
            .createQueryBuilder('product')
            .select([
                'product.id',
                'product.name',
                'product.description',
                'product.price',
                'product.originalPrice',
                'product.imageUrl',
                'product.isActive',
            ])
            .where('product.isActive = :isActive', { isActive: true })
            .getMany();
    }

    async findOne(id: number): Promise<Product | null> {
        return this.repository.findOneBy({ id });
    }

    async update(id: number, data: Partial<Product>): Promise<void> {
        await this.repository.update(id, data);
    }

    async delete(id: number): Promise<void> {
        await this.repository.delete(id);
    }
}
