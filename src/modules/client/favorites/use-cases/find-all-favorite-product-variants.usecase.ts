import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteItemType } from '../enum/favorite-type.enum';
import { ProductVariant } from '@/modules/commerce/product/entities/variants.entity';
import { Injectable } from '@nestjs/common';
import { FindFavoriteProductVariantsDto } from '../dto/favorite-product-variant.dto';

@Injectable()
export class FindFavoriteProductVariantsUseCase {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async execute(clientId: number, query?: FindFavoriteProductVariantsDto) {
    const queryBuilder = this.variantRepository
      .createQueryBuilder('variant')
      .innerJoin(
        'favorites',
        'fav',
        'fav.item_id = variant.id AND fav.client_id = :clientId AND fav.item_type = :itemType',
        { clientId, itemType: FavoriteItemType.PRODUCT_VARIANT },
      )
      .leftJoinAndSelect('variant.product', 'product');

    if (query?.search) {
      queryBuilder.andWhere(
        '(variant.name ILIKE :search OR variant.sku ILIKE :search OR variant.description ILIKE :search)',
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
