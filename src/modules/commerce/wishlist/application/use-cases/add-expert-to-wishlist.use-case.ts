// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import {
  ExpertAlreadyInWishlistError,
  ExpertNotFoundError,
  UserNotFoundError,
  NotAnExpertError,
} from '../../domain/errors/wishlist.errors';

@Injectable()
export class AddExpertToWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(ProfileClient)
    private readonly profileClientRepo: Repository<ProfileClient>,
    @InjectRepository(ProfileExpert)
    private readonly profileExpertRepo: Repository<ProfileExpert>,
  ) {}

  async execute(userId: string, expertId: string): Promise<Wishlist> {
    const client = await this.profileClientRepo.findOne({ where: { user: { id: userId } } });
    if (!client) {
      throw new UserNotFoundError();
    }

    let expert = await this.profileExpertRepo.findOne({ where: { user: { id: expertId } } });
    if (!expert) {
      expert = await this.profileExpertRepo.findOne({ where: { id: expertId } });
    }
    
    if (!expert) {
      throw new ExpertNotFoundError(expertId);
    }

    const existing = await this.wishlistRepository.findOne({
      where: { client: { id: client.id }, expert: { id: expert.id } },
    });

    if (existing) {
      throw new ExpertAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client: client,
      expert: expert,
    });

    const savedWishlist = await this.wishlistRepository.save(wishlist);

    // Update total_likes for the expert
    const currentLikes = Number(expert.total_likes) || 0;
    expert.total_likes = currentLikes + 1;
    await this.profileExpertRepo.save(expert);

    return savedWishlist;
  }
}
