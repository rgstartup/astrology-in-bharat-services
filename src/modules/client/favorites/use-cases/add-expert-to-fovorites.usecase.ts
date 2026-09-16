import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Favorites } from '../entities/favorites.entity';
import { Repository } from 'typeorm';
import { FavoriteItemType } from '../enum/favorite-type.enum';

@Injectable()
export class AddExpertToFavorites {
  constructor(
    @InjectRepository(Favorites)
    private readonly favoritesRepository: Repository<Favorites>,
  ) {}

  async execute(clientId: number, expertId: number) {
    const existingFavorite = await this.favoritesRepository.findOne({
      where: {
        client_id: clientId,
        item_id: expertId,
        item_type: FavoriteItemType.EXPERT,
      },
    });

    if (existingFavorite) {
      return existingFavorite;
    }

    const favorite = new Favorites();
    favorite.client_id = clientId;
    favorite.item_id = expertId;
    favorite.item_type = FavoriteItemType.EXPERT;
    return this.favoritesRepository.save(favorite);
  }
}
