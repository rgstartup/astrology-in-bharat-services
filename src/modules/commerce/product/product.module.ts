import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './api/controllers/product.controller';
import { Product } from './infrastructure/entities/product.entity';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { ProfileModule as MerchantProfileModule } from '@/modules/merchant/profile/profile.module';
import { ProductFacade } from './application/product.facade';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { FindAllProductsUseCase } from './application/use-cases/find-all-products.use-case';
import { FindProductUseCase } from './application/use-cases/find-product.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { RemoveProductUseCase } from './application/use-cases/remove-product.use-case';
import { MerchantProductsUseCase } from './application/use-cases/merchant-products.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    CloudinaryModule,
    MerchantProfileModule,
  ],
  controllers: [ProductController],
  providers: [
    ProductFacade,
    CreateProductUseCase,
    FindAllProductsUseCase,
    FindProductUseCase,
    UpdateProductUseCase,
    RemoveProductUseCase,
    MerchantProductsUseCase,
  ],
  exports: [FindProductUseCase, TypeOrmModule, ProductFacade],
})
export class ProductModule {}
