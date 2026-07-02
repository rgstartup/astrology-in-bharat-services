import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';

@Injectable()
export class TogglePujaWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly expertProfileFacade: ExpertProfileFacade,
  ) {}

  async execute(
    profileId: string,
    pujaId: string,
  ): Promise<{ liked: boolean; total_likes: number }> {
    const puja = await this.expertProfileFacade.getPujaById(pujaId);
    if (!puja) throw new NotFoundException('Puja not found');

    const existing = await this.wishlistRepository.findOne({
      where: { client_id: profileId, puja: { id: pujaId } },
    });

    let liked = false;
    let currentTotalLikes = puja.total_likes || 0;

    if (existing) {
      await this.wishlistRepository.remove(existing);
      await this.expertProfileFacade.updatePujaLikes(pujaId, -1);
      currentTotalLikes = Math.max(0, currentTotalLikes - 1);
      liked = false;
    } else {
      const wishlist = this.wishlistRepository.create({
        client_id: profileId,
        puja,
      });
      await this.wishlistRepository.save(wishlist);
      await this.expertProfileFacade.updatePujaLikes(pujaId, 1);
      currentTotalLikes = currentTotalLikes + 1;
      liked = true;
    }

    return { liked, total_likes: currentTotalLikes };
  }
}
