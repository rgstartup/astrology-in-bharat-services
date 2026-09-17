import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Favorites } from '../entities/favorites.entity';
import { Repository } from 'typeorm';
import { FavoriteItemType } from '../enum/favorite-type.enum';

@Injectable()
export class AddProductVariantToFavoritesUseCase {
  constructor(
    @InjectRepository(Favorites)
    private readonly favoritesRepository: Repository<Favorites>,
  ) {}

  async execute(clientId: number, variantId: number) {
    const existingFavorite = await this.favoritesRepository.findOne({
      where: {
        client_id: clientId,
        item_id: variantId,
        item_type: FavoriteItemType.PRODUCT_VARIANT,
      },
    });

    if (existingFavorite) {
      return existingFavorite;
    }

    const favorite = new Favorites();
    favorite.client_id = clientId;
    favorite.item_id = variantId;
    favorite.item_type = FavoriteItemType.PRODUCT_VARIANT;
    return this.favoritesRepository.save(favorite);
  }
}
