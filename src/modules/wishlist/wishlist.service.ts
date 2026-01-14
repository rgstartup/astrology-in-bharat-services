import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { Product } from '@/modules/product/entities/product.entity';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class WishlistService {
    constructor(
        @InjectRepository(Wishlist)
        private wishlistRepository: Repository<Wishlist>,
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async findAll(userId: number) {
        return this.wishlistRepository.find({
            where: { user: { id: userId } },
            relations: ['product'],
            order: { createdAt: 'DESC' },
        });
    }

    async create(userId: number, productId: number) {
        const product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const existing = await this.wishlistRepository.findOne({
            where: { user: { id: userId }, product: { id: productId } },
        });

        if (existing) {
            throw new ConflictException('Product already in wishlist');
        }

        const wishlist = this.wishlistRepository.create({
            user,
            product,
        });

        return this.wishlistRepository.save(wishlist);
    }

    async remove(userId: number, productId: number) {
        const wishlist = await this.wishlistRepository.findOne({
            where: { user: { id: userId }, product: { id: productId } },
        });

        if (!wishlist) {
            throw new NotFoundException('Product not found in wishlist');
        }

        await this.wishlistRepository.remove(wishlist);
        return { message: 'Product removed from wishlist' };
    }
}
