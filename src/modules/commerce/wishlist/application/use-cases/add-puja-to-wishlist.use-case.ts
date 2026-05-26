// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/entities/expert-puja.entity';
import {
  PujaAlreadyInWishlistError,
  PujaNotFoundError,
  UserNotFoundError,
} from '../../domain/errors/wishlist.errors';

@Injectable()
export class AddPujaToWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(ProfileClient)
    private readonly profileClientRepo: Repository<ProfileClient>,
    @InjectRepository(ExpertPuja)
    private readonly expertPujaRepository: Repository<ExpertPuja>,
  ) {}

  async execute(userId: string, pujaId: string): Promise<Wishlist> {
    const puja = await this.expertPujaRepository.findOne({
      where: { id: pujaId },
    });

    if (!puja) {
      throw new PujaNotFoundError();
    }

    const client = await this.profileClientRepo.findOne({ where: { user: { id: userId } } });
    if (!client) {
      throw new UserNotFoundError();
    }

    const existing = await this.wishlistRepository.findOne({
      where: { client: { id: client.id }, puja: { id: pujaId } },
    });

    if (existing) {
      throw new PujaAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client,
      puja,
    });

    return await this.wishlistRepository.save(wishlist);
  }
}
