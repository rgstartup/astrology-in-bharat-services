import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../entities/wishlist.entity';

@Injectable()
export class GetProductWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(profileId: number): Promise<Wishlist[]> {
    return this.wishlistRepository.find({
      where: { client_id: profileId },
      relations: ['product', 'expert'],
      order: { created_at: 'DESC' },
    });
  }
}
