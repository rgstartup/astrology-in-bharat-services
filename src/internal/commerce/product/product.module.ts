import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './controllers/product.controller';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { MerchantAccountModule } from '@/internal/domains/merchant/account/account.module';
import { ProductService } from './product.service';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { FindAllProductsUseCase } from './use-cases/find-all-products.use-case';
import { FindProductUseCase } from './use-cases/find-product.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';
import { RemoveProductUseCase } from './use-cases/remove-product.use-case';
import { MerchantProductsUseCase } from './use-cases/merchant-products.usecase';
import {
  Product,
  ProductVariant,
  ProductInventory,
  ProductFulFillment,
  ProductVariantPricing,
  ProductVariantPromotions,
  ProductMedia,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductVariant,
      ProductInventory,
      ProductFulFillment,
      ProductVariantPricing,
      ProductVariantPromotions,
      ProductMedia,
    ]),
    CloudinaryModule,
    MerchantAccountModule,
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    CreateProductUseCase,
    FindAllProductsUseCase,
    FindProductUseCase,
    UpdateProductUseCase,
    RemoveProductUseCase,
    MerchantProductsUseCase,
  ],
  exports: [FindProductUseCase, TypeOrmModule, ProductService],
})
export class ProductModule {}
