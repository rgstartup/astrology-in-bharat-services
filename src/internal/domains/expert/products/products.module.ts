import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertProducts } from './entities/expert-product.entity';
import { Product } from '@/internal/commerce/product/entities/product.entity';
import { ExpertAccount } from '@/internal/domains/expert/account/entities/account.entity';
import { ProductVariant } from '@/internal/commerce/product/entities/variants.entity';
import { ProductCategory } from '@/internal/commerce/product/entities/category.entity';
import { ProductMedia } from '@/internal/commerce/product/entities/media.entity';
import { Media } from '@/internal/media/entities/media.entity';
import { ExpertProductsController } from './controllers/products.controller';
import { ExpertProductsService } from './products.service';
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
    ExpertProductsService,
    FindExpertProductsUseCase,
    FindExpertProductByIdUseCase,
  ],
  exports: [ExpertProductsService],
})
export class ExpertProductsModule {}
