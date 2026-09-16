import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteItemType } from '../enum/favorite-type.enum';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { Injectable } from '@nestjs/common';
import { FindFavoritesDto } from '../dto/findFavorites.dto';

@Injectable()
export class FindAllFavoriteExperts {
  constructor(
    @InjectRepository(ExpertAccount)
    private readonly expertRepository: Repository<ExpertAccount>,
  ) {}

  async execute(clientId: number, query?: FindFavoritesDto) {
    const queryBuilder = this.expertRepository
      .createQueryBuilder('expert')
      .innerJoin(
        'favorites',
        'fav',
        'fav.item_id = expert.id AND fav.client_id = :clientId AND fav.item_type = :itemType',
        { clientId, itemType: FavoriteItemType.EXPERT },
      );

    if (query?.search) {
      queryBuilder.andWhere(
        '(expert.name ILIKE :search OR expert.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query?.limit) {
      queryBuilder.take(query.limit);
    }
    if (query?.offset) {
      queryBuilder.skip(query.offset);
    }

    return queryBuilder.getMany();
  }
}
