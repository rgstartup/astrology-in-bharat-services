import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { IExpertRepository } from '@/modules/expert';
import { IProductRepository } from '@/modules/product';
import { Product } from '@/modules/product/domain/entities/product.entity';
import { IUserRepository } from '@/modules/users';
import { User } from '@/modules/users/domain/entities/user.entity';
import { Wishlist } from '../../domain/entities/wishlist.entity';
import { IWishlistRepository } from '../../domain/repositories/wishlist.repository.interface';

@Injectable()
export class WishlistService {
  constructor(
    @Inject(IWishlistRepository)
    private wishlistRepository: IWishlistRepository,
    @Inject(IProductRepository)
    private productRepository: IProductRepository,
    @Inject(IUserRepository)
    private userRepository: IUserRepository,
    @Inject(IExpertRepository)
    private expertRepository: IExpertRepository,
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
    return wishlists.filter((item) => item.expert);
  }

  async create(userId: number, productId: number) {
    const product = await this.productRepository.findOne(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const user = await this.userRepository.findById(userId);
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
    let expertUser = await this.userRepository.findById(expertId, ['roles']);
    let foundViaProfile = false;

    if (!expertUser) {
      // Try matching by ProfileExpert ID
      const profileExpert = await this.expertRepository.findById(expertId);

      if (profileExpert && profileExpert.user) {
        expertUser = await this.userRepository.findById(profileExpert.user.id, ['roles']);
        expertId = expertUser!.id; // Update expertId to User ID for storage
        foundViaProfile = true;
      } else {
        throw new NotFoundException(`Expert with ID ${expertId} not found`);
      }
    }

    const hasExpertRole =
      expertUser!.roles && expertUser!.roles.some((r) => r.name === 'expert');

    // If we found the user via their ProfileExpert record, we consider them an expert
    // even if the 'expert' role is missing from the roles table (data inconsistency).
    if (!hasExpertRole && !foundViaProfile) {
      const roleNames = expertUser!.roles
        ? expertUser!.roles.map((r) => r.name).join(', ')
        : 'No roles';
      throw new NotFoundException(
        `User with ID ${expertId} is not an expert (Roles: ${roleNames})`,
      );
    }

    // Use the correct User ID for the wishlist entry
    const finalExpertId = expertUser!.id;

    const user = await this.userRepository.findById(userId);
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
      expert: expertUser!,
    });

    const savedWishlist = await this.wishlistRepository.save(wishlist);

    // Increment total_likes for the expert
    const profileExpert = await this.expertRepository.findByUserId(finalExpertId);
    if (profileExpert) {
      console.log(
        `[WishlistService] Incrementing likes for expert ${finalExpertId}, current: ${profileExpert.total_likes}, type: ${typeof profileExpert.total_likes}`,
      );
      const currentLikes = Number(profileExpert.total_likes) || 0;
      profileExpert.total_likes = currentLikes + 1;
      await this.expertRepository.save(profileExpert);
      console.log(
        `[WishlistService] Incremented likes. New total: ${profileExpert.total_likes}`,
      );
    } else {
      console.warn(
        `[WishlistService] ProfileExpert not found for user ${finalExpertId} when trying to increment likes`,
      );
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
    const profileExpert = await this.expertRepository.findByUserId(expertId);
    if (profileExpert) {
      console.log(
        `[WishlistService] Decrementing likes for expert ${expertId}, current: ${profileExpert.total_likes}`,
      );
      // Prevent negative likes
      const currentLikes = profileExpert.total_likes || 0;
      if (currentLikes > 0) {
        profileExpert.total_likes = currentLikes - 1;
        await this.expertRepository.save(profileExpert);
        console.log(
          `[WishlistService] Decremented likes. New total: ${profileExpert.total_likes}`,
        );
      }
    } else {
      console.warn(
        `[WishlistService] ProfileExpert not found for user ${expertId} when trying to decrement likes`,
      );
    }

    return { message: 'Expert removed from wishlist' };
  }
}
