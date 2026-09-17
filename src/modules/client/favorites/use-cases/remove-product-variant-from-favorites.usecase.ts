import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Favorites } from '../entities/favorites.entity';
import { Repository } from 'typeorm';
import { FavoriteItemType } from '../enum/favorite-type.enum';

@Injectable()
export class RemoveProductVariantFromFavoritesUseCase {
  constructor(
    @InjectRepository(Favorites)
    private readonly favoritesRepository: Repository<Favorites>,
  ) {}

  async execute(clientId: number, variantId: number) {
    return this.favoritesRepository.delete({
      client_id: clientId,
      item_id: variantId,
      item_type: FavoriteItemType.PRODUCT_VARIANT,
    });
  }
}

export { RemoveProductVariantFromFavoritesUseCase as RemoveProductVariantFromFavorites };
