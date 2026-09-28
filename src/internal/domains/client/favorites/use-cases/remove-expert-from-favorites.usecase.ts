import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Favorites } from '../entities/favorites.entity';
import { Repository } from 'typeorm';
import { FavoriteItemType } from '../enum';

@Injectable()
export class RemoveExpertFromFavoritesUseCase {
  constructor(
    @InjectRepository(Favorites)
    private readonly favoritesRepository: Repository<Favorites>,
  ) {}

  async execute(clientId: number, expertId: number) {
    return this.favoritesRepository.delete({
      client_id: clientId,
      item_id: expertId,
      item_type: FavoriteItemType.EXPERT,
    });
  }
}
