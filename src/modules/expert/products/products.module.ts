import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertProducts } from './entities/expert-product.entity';
import { Product } from '@/modules/commerce/product/entities/product.entity';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { ProductVariant } from '@/modules/commerce/product/entities/variants.entity';
import { ProductCategory } from '@/modules/commerce/product/entities/category.entity';
import { ProductMedia } from '@/modules/commerce/product/entities/media.entity';
import { Media } from '@/modules/media/entities/media.entity';
import { ExpertProductsController } from './controllers/products.controller';
import { ExpertProductsFacade } from './products.facade';
import { FindExpertProductsUseCase } from './use-cases/find-expert-products.usecase';
import { FindExpertProductByIdUseCase } from './use-cases/find-expert-product-by-id.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExpertProducts,
      Product,
      ExpertAccount,
      ProductVariant,
      ProductCategory,
      ProductMedia,
      Media,
    ]),
  ],
  controllers: [ExpertProductsController],
  providers: [
    ExpertProductsFacade,
    FindExpertProductsUseCase,
    FindExpertProductByIdUseCase,
  ],
  exports: [ExpertProductsFacade],
})
export class ExpertProductsModule {}
