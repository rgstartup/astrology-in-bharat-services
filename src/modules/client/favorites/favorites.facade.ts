import { Injectable, BadRequestException } from '@nestjs/common';
import { AddExpertToFavorites } from './use-cases/add-expert-to-fovorites.usecase';
import { FindAllFavoriteExperts } from './use-cases/find-all-favorite-experts.usecase';
import { RemoveExpertFromFavorites } from './use-cases/remove-expert-from-favorites.usecase';
import { FindFavoritesDto } from './dto/findFavorites.dto';
import { AddFavoriteDto, RemoveFavoriteDto } from './dto/favorite.dto';
import { FavoriteItemType } from './enum/favorite-type.enum';

@Injectable()
export class FavoritesFacade {
  constructor(
    private readonly addExpertToFavoritesUseCase: AddExpertToFavorites,
    private readonly findAllFavoriteExpertsUseCase: FindAllFavoriteExperts,
    private readonly removeExpertFromFavoritesUseCase: RemoveExpertFromFavorites,
  ) {}

  async findAll(clientId: number, query?: FindFavoritesDto) {
    return this.findAllFavoriteExpertsUseCase.execute(clientId, query);
  }

  async findAllExperts(clientId: number, query?: FindFavoritesDto) {
    return this.findAllFavoriteExpertsUseCase.execute(clientId, query);
  }

  async add(data: AddFavoriteDto) {
    if (!data.clientId) {
      throw new BadRequestException('Client ID is required');
    }

    if (data.item_type === FavoriteItemType.EXPERT) {
      return this.addExpertToFavorites(data.clientId, data.item_id);
    }

    throw new BadRequestException(
      `Unsupported favorite item type: ${data.item_type}`,
    );
  }

  async remove(data: RemoveFavoriteDto) {
    if (!data.clientId) {
      throw new BadRequestException('Client ID is required');
    }

    const expertId = data.item_id ?? data.id;
    if (!expertId) {
      throw new BadRequestException('Item ID is required');
    }

    return this.removeExpertFromFavorites(data.clientId, expertId);
  }

  async addExpertToFavorites(clientId: number, expertId: number) {
    return this.addExpertToFavoritesUseCase.execute(clientId, expertId);
  }

  async removeExpertFromFavorites(clientId: number, expertId: number) {
    return this.removeExpertFromFavoritesUseCase.execute(clientId, expertId);
  }

  async getFavoriteExperts(clientId: number, query?: FindFavoritesDto) {
    return this.findAllFavoriteExpertsUseCase.execute(clientId, query);
  }
}
