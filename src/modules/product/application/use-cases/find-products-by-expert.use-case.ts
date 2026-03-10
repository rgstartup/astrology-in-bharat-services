import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../infrastructure/persistence/entities/product.entity';

@Injectable()
export class FindProductsByExpertUseCase {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async execute(expertId: number): Promise<Product[]> {
        return this.productRepository
            .createQueryBuilder('product')
            .select([
                'product.id',
                'product.name',
                'product.description',
                'product.price',
                'product.original_price',
                'product.image_url',
                'product.short_description',
                'product.stock',
                'product.is_active',
                'product.expert_id',
                'product.created_at',
            ])
            .where('product.expert_id = :expertId', { expertId })
            .orderBy('product.created_at', 'DESC')
            .getMany();
    }
}
