
import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ProductNotInWishlistError, UserNotFoundError } from '../../domain/errors/wishlist.errors';
import { ClientProfileFacade } from '@/modules/client/profile/application/profile.facade';

@Injectable()
export class RemoveProductFromWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly clientProfileFacade: ClientProfileFacade,
  ) {}

  async execute(userId: string, productId: string): Promise<BooleanMessage> {
    const client = await this.clientProfileFacade.getProfile(userId);
    if (!client) {
      throw new UserNotFoundError();
    }

    const result = await this.wishlistRepository.delete({ client: { id: client.id } as any, product: { id: productId } as any });

    if (result.affected === 0) {
      throw new ProductNotInWishlistError();
    }
    return new BooleanMessage();
  }
}
