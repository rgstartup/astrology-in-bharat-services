import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { Product } from '@/modules/product/entities/product.entity';
import { User } from '@/modules/users/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';

@Injectable()
export class WishlistService {
    constructor(
        @InjectRepository(Wishlist)
        private wishlistRepository: Repository<Wishlist>,
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(ProfileExpert)
        private profileExpertRepository: Repository<ProfileExpert>,
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
        let expertUser = await this.userRepository.findOne({ where: { id: expertId }, relations: ['roles'] });
        let foundViaProfile = false;

        if (!expertUser) {
            // Try matching by ProfileExpert ID
            const profileExpert = await this.profileExpertRepository.findOne({
                where: { id: expertId },
                relations: ['user', 'user.roles']
            });

            if (profileExpert && profileExpert.user) {
                expertUser = profileExpert.user;
                expertId = expertUser.id; // Update expertId to User ID for storage
                foundViaProfile = true;
            } else {
                throw new NotFoundException(`Expert with ID ${expertId} not found`);
            }
        }

        const hasExpertRole = expertUser.roles && expertUser.roles.some(r => r.name === 'expert');

        // If we found the user via their ProfileExpert record, we consider them an expert 
        // even if the 'expert' role is missing from the roles table (data inconsistency).
        if (!hasExpertRole && !foundViaProfile) {
            const roleNames = expertUser.roles ? expertUser.roles.map(r => r.name).join(', ') : 'No roles';
            throw new NotFoundException(`User with ID ${expertId} is not an expert (Roles: ${roleNames})`);
        }

        // Use the correct User ID for the wishlist entry
        const finalExpertId = expertUser.id;

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const existing = await this.wishlistRepository.findOne({
            where: { user: { id: userId }, expert: { id: finalExpertId } },
        });

        if (existing) {
            throw new ConflictException('Expert already in wishlist');
        }

        const wishlist = this.wishlistRepository.create({
            user,
            expert: expertUser,
        });

        const savedWishlist = await this.wishlistRepository.save(wishlist);

        // Increment total_likes for the expert
        const profileExpert = await this.profileExpertRepository.findOne({ where: { user: { id: finalExpertId } } });
        if (profileExpert) {
            await this.profileExpertRepository.increment({ id: profileExpert.id }, 'total_likes', 1);
        }

        return savedWishlist;
    }

    async removeExpert(userId: number, expertId: number) {
        const wishlist = await this.wishlistRepository.findOne({
            where: { user: { id: userId }, expert: { id: expertId } },
        });

        if (!wishlist) {
            throw new NotFoundException('Expert not found in wishlist');
        }

        await this.wishlistRepository.remove(wishlist);

        // Decrement total_likes for the expert
        const profileExpert = await this.profileExpertRepository.findOne({ where: { user: { id: expertId } } });
        if (profileExpert) {
            await this.profileExpertRepository.decrement({ id: profileExpert.id }, 'total_likes', 1);
        }

        return { message: 'Expert removed from wishlist' };
    }
}
