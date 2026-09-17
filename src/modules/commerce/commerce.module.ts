import { Module } from '@nestjs/common';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { CouponModule } from './coupon/coupon.module';

@Module({
  imports: [ProductModule, CartModule, CouponModule],
  exports: [ProductModule, CartModule, CouponModule],
})
export class CommerceModule {}
