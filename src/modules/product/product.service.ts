import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
    constructor(
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
    ) { }

    create(createProductDto: CreateProductDto) {
        const product = this.productRepository.create(createProductDto);
        return this.productRepository.save(product);
    }

    findAll() {
        // Using query builder to select specific columns as per best practices
        return this.productRepository.createQueryBuilder('product')
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

    findOne(id: number) {
        return this.productRepository.findOneBy({ id });
    }

    async update(id: number, updateProductDto: UpdateProductDto) {
        await this.productRepository.update(id, updateProductDto);
        return this.findOne(id);
    }

    async remove(id: number) {
        await this.productRepository.delete(id);
        return { message: 'Product deleted successfully' };
    }
}
