import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { FindUserUseCase } from '@/modules/users/application/use-cases/find-user.usecase';
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
    private readonly findUserUseCase: FindUserUseCase,
    @InjectRepository(ExpertPuja)
    private readonly expertPujaRepository: Repository<ExpertPuja>,
  ) {}

  async execute(userId: number, pujaId: number): Promise<Wishlist> {
    const puja = await this.expertPujaRepository.findOne({
      where: { id: pujaId },
    });

    if (!puja) {
      throw new PujaNotFoundError();
    }

    let user;
    try {
      user = await this.findUserUseCase.findById(userId);
    } catch (e) {
      throw new UserNotFoundError();
    }

    const existing = await this.wishlistRepository.findOne({
      where: { user: { id: userId }, puja: { id: pujaId } },
    });

    if (existing) {
      throw new PujaAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      user,
      puja,
    });

    return await this.wishlistRepository.save(wishlist);
  }
}
