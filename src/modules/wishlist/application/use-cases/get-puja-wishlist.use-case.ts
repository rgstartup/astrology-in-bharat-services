import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/persistence/entities/wishlist.entity';

@Injectable()
export class GetPujaWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(userId: number): Promise<Wishlist[]> {
    return await this.wishlistRepository.find({
      where: { user: { id: userId }, puja: { id: (await import('typeorm')).Not((await import('typeorm')).IsNull()) } },
      relations: ['puja', 'puja.expert'],
    });
  }
}
