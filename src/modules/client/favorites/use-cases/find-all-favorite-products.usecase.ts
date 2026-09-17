import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteItemType } from '../enum/favorite-type.enum';
import { Product } from '@/modules/commerce/product/entities/product.entity';
import { Injectable } from '@nestjs/common';
import { FindFavoriteProductsDto } from '../dto/favorite-product.dto';

@Injectable()
export class FindFavoriteProductsUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(clientId: number, query?: FindFavoriteProductsDto) {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .innerJoin(
        'favorites',
        'fav',
        'fav.item_id = product.id AND fav.client_id = :clientId AND fav.item_type = :itemType',
        { clientId, itemType: FavoriteItemType.PRODUCT },
      )
      .leftJoinAndSelect('product.categories', 'categories')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('product.media', 'media');

    if (query?.search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
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
