import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { DataSource } from 'typeorm';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/entities/expert-puja.entity';

@Injectable()
export class TogglePujaWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly expertProfileFacade: ExpertProfileFacade,
    private readonly dataSource: DataSource,
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let liked = false;
    let currentTotalLikes = puja.total_likes || 0;

    try {
      if (existing) {
        await queryRunner.manager.remove(Wishlist, existing);
        await queryRunner.manager.decrement(ExpertPuja, { id: pujaId }, 'total_likes', 1);
        currentTotalLikes = Math.max(0, currentTotalLikes - 1);
        liked = false;
      } else {
        const wishlist = queryRunner.manager.create(Wishlist, {
          client_id: profileId,
          puja,
        });
        await queryRunner.manager.save(Wishlist, wishlist);
        await queryRunner.manager.increment(ExpertPuja, { id: pujaId }, 'total_likes', 1);
        currentTotalLikes = currentTotalLikes + 1;
        liked = true;
      }

      await queryRunner.commitTransaction();
      return { liked, total_likes: currentTotalLikes };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Failed to toggle puja wishlist:', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
