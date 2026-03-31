import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/persistence/entities/wishlist.entity';
import { PujaNotInWishlistError } from '../../domain/errors/wishlist.errors';

@Injectable()
export class RemovePujaFromWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(userId: number, pujaId: number): Promise<void> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { user: { id: userId }, puja: { id: pujaId } },
    });

    if (!wishlist) {
      throw new PujaNotInWishlistError();
    }

    await this.wishlistRepository.remove(wishlist);
  }
}
