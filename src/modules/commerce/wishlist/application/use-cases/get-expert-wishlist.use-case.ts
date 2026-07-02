import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';

@Injectable()
export class GetExpertWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(profileId: string): Promise<Wishlist[]> {
    const wishlists = await this.wishlistRepository.find({
      where: { client_id: profileId },
      relations: ['expert'],
      order: { created_at: 'DESC' },
    });
    return wishlists.filter((item) => item.expert);
  }
}
