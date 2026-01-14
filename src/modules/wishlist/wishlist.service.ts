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
            relations: ['product', 'expert'],
            order: { createdAt: 'DESC' },
        });
    }

    async findAllExperts(userId: number) {
        const wishlists = await this.wishlistRepository.find({
            where: { user: { id: userId } },
            relations: ['expert'],
            order: { createdAt: 'DESC' },
        });
        return wishlists.filter(item => item.expert);
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

    async createExpert(userId: number, expertId: number) {
        const expert = await this.userRepository.findOne({ where: { id: expertId, roles: { name: 'expert' } }, relations: ['roles'] });
        if (!expert) {
            throw new NotFoundException('Expert not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const existing = await this.wishlistRepository.findOne({
            where: { user: { id: userId }, expert: { id: expertId } },
        });

        if (existing) {
            throw new ConflictException('Expert already in wishlist');
        }

        const wishlist = this.wishlistRepository.create({
            user,
            expert,
        });

        return this.wishlistRepository.save(wishlist);
    }

    async removeExpert(userId: number, expertId: number) {
        const wishlist = await this.wishlistRepository.findOne({
            where: { user: { id: userId }, expert: { id: expertId } },
        });

        if (!wishlist) {
            throw new NotFoundException('Expert not found in wishlist');
        }

        await this.wishlistRepository.remove(wishlist);
        return { message: 'Expert removed from wishlist' };
    }
}
