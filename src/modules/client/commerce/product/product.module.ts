import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './controllers/product.controller';
import { Product } from './entities/product.entity';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { ProfileModule as MerchantProfileModule } from '@/modules/merchant/profile/profile.module';
import { ProductFacade } from './product.facade';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { FindAllProductsUseCase } from './use-cases/find-all-products.use-case';
import { FindProductUseCase } from './use-cases/find-product.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';
import { RemoveProductUseCase } from './use-cases/remove-product.use-case';
import { MerchantProductsUseCase } from './use-cases/merchant-products.usecase';

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
