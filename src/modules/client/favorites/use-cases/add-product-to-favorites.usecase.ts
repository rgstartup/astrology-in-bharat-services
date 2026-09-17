import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Favorites } from '../entities/favorites.entity';
import { Repository } from 'typeorm';
import { FavoriteItemType } from '../enum/favorite-type.enum';

@Injectable()
export class AddProductToFavoritesUseCase {
  constructor(
    @InjectRepository(Favorites)
    private readonly favoritesRepository: Repository<Favorites>,
  ) {}

  async execute(clientId: number, productId: number) {
    const existingFavorite = await this.favoritesRepository.findOne({
      where: {
        client_id: clientId,
        item_id: productId,
        item_type: FavoriteItemType.PRODUCT,
      },
    });

    if (existingFavorite) {
      return existingFavorite;
    }

    const favorite = new Favorites();
    favorite.client_id = clientId;
    favorite.item_id = productId;
    favorite.item_type = FavoriteItemType.PRODUCT;
    return this.favoritesRepository.save(favorite);
  }
}
