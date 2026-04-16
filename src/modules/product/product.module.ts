import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './api/controllers/product.controller';
import { Product } from './infrastructure/persistence/entities/product.entity';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { ProfileMerchant } from '../merchant/profile/infrastructure/persistence/entities/profile-merchant.entity';
import { ProductFacade } from './application/product.facade';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { FindAllProductsUseCase } from './application/use-cases/find-all-products.use-case';
import { FindProductUseCase } from './application/use-cases/find-product.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { RemoveProductUseCase } from './application/use-cases/remove-product.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProfileMerchant]), CloudinaryModule],
  controllers: [ProductController],
  providers: [
    ProductFacade,
    CreateProductUseCase,
    FindAllProductsUseCase,
    FindProductUseCase,
    UpdateProductUseCase,
    RemoveProductUseCase,
  ],
  exports: [FindProductUseCase, TypeOrmModule],
})
export class ProductModule { }
