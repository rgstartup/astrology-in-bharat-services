import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './application/services/product.service';
import { ProductController } from './interfaces/controllers/product.controller';
import { Product } from './domain/entities/product.entity';
import { CloudinaryModule } from '@/common/infrastructure/storage/cloudinary/cloudinary.module';
import { IProductRepository } from './domain/repositories/product.repository.interface';
import { TypeOrmProductRepository } from './infrastructure/persistence/typeorm-product.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), CloudinaryModule],
  controllers: [ProductController],
  providers: [
    ProductService,
    {
      provide: IProductRepository,
      useClass: TypeOrmProductRepository,
    },
  ],
  exports: [ProductService, IProductRepository],
})
export class ProductModule { }

