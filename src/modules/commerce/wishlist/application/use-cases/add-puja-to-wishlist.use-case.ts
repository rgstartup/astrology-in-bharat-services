
import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ClientProfileFacade } from '@/modules/client/profile/application/profile.facade';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
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
    private readonly clientProfileFacade: ClientProfileFacade,
    private readonly expertProfileFacade: ExpertProfileFacade,
  ) {}

  async execute(userId: string, pujaId: string): Promise<BooleanMessage> {
    const puja = await this.expertProfileFacade.getPujaById(pujaId);
    
    if (!puja) {
      throw new PujaNotFoundError();
    }

    const client = await this.clientProfileFacade.getProfile(userId);
    if (!client) {
      throw new UserNotFoundError();
    }

    const existing = await this.wishlistRepository.findOne({
      where: { client: { id: client.id }, puja: { id: puja.id } },
    });

    if (existing) {
      throw new PujaAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client,
      puja,
    });

    await this.wishlistRepository.save(wishlist);
    return new BooleanMessage();
  }
}
