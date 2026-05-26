// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';

@Injectable()
export class GetPujaWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) { }

  async execute(userId: string): Promise<Wishlist[]> {
    const wishlists = await this.wishlistRepository.find({
      where: { client: { user: { id: userId } } },
      relations: ['puja'],
      order: { created_at: 'DESC' },
    });
    return wishlists.filter((item) => item.puja);
  }
}
