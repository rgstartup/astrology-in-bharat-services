import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '../../../../shared/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../entities/wishlist.entity';
import { ExpertProfileService } from '../../../actors/expert/profile/profile.service';
import {
  PujaAlreadyInWishlistError,
  PujaNotFoundError,
  UserNotFoundError,
} from '../domain/errors/wishlist.errors';

@Injectable()
export class AddPujaToWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly expertProfileService: ExpertProfileService,
  ) {}

  async execute(profileId: number, pujaId: number): Promise<BooleanMessage> {
    const puja = await this.expertProfileService.getPujaById(pujaId);

    if (!puja) {
      throw new PujaNotFoundError();
    }

    if (!profileId) {
      throw new UserNotFoundError();
    }

    const existing = await this.wishlistRepository.findOne({
      where: { client_id: profileId, puja: { id: puja.id } },
    });

    if (existing) {
      throw new PujaAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client_id: profileId,
      puja,
    });

    await this.wishlistRepository.save(wishlist);
    return new BooleanMessage();
  }
}
