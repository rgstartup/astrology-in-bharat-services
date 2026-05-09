import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/entities/expert-puja.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class TogglePujaWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(ExpertPuja)
    private readonly pujaRepository: Repository<ExpertPuja>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(userId: number, pujaId: number): Promise<{ liked: boolean; total_likes: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const puja = await this.pujaRepository.findOne({ where: { id: pujaId } });
    if (!puja) throw new NotFoundException('Puja not found');

    const existing = await this.wishlistRepository.findOne({
      where: { user: { id: userId }, puja: { id: pujaId } },
    });

    let liked = false;
    if (existing) {
      await this.wishlistRepository.remove(existing);
      puja.total_likes = Math.max(0, (puja.total_likes || 0) - 1);
      liked = false;
    } else {
      const wishlist = this.wishlistRepository.create({ user, puja });
      await this.wishlistRepository.save(wishlist);
      puja.total_likes = (puja.total_likes || 0) + 1;
      liked = true;
    }

    await this.pujaRepository.save(puja);

    return { liked, total_likes: puja.total_likes };
  }
}
