// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ExpertNotInWishlistError } from '../../domain/errors/wishlist.errors';

@Injectable()
export class RemoveExpertFromWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(ProfileExpert)
    private readonly profileExpertRepository: Repository<ProfileExpert>,
  ) {}

  async execute(userId: string, expertId: string): Promise<{ message: string }> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { client: { user: { id: userId } }, expert: { id: expertId } },
    });

    if (!wishlist) {
      throw new ExpertNotInWishlistError();
    }

    await this.wishlistRepository.remove(wishlist);

    const profileExpert = await this.profileExpertRepository.findOne({
      where: { user: { id: expertId } },
    });
    
    if (profileExpert) {
      const currentLikes = profileExpert.total_likes || 0;
      if (currentLikes > 0) {
        profileExpert.total_likes = currentLikes - 1;
        await this.profileExpertRepository.save(profileExpert);
      }
    }

    return { message: 'Expert removed from wishlist' };
  }
}
