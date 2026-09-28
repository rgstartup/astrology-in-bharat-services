import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../entities/wishlist.entity';

@Injectable()
export class GetExpertWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(profileId: number): Promise<Wishlist[]> {
    const wishlists = await this.wishlistRepository.find({
      where: { client_id: profileId },
      relations: ['expert'],
      order: { created_at: 'DESC' },
    });
    return wishlists.filter((item) => item.expert);
  }
}
