import { Module } from '@nestjs/common';
import { ProductModule } from './product/product.module';
import { CouponModule } from './coupon/coupon.module';
import { ProductCategoryModule } from './product-category/product-category.module';

@Module({
  imports: [ProductCategoryModule, CouponModule, ProductModule],
  exports: [ProductCategoryModule, CouponModule, ProductModule],
})
export class CommerceModule {}
