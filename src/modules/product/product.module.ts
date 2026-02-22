import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Product } from './entities/product.entity';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), CloudinaryModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
