import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { CouponModule } from './coupon/coupon.module';

@Module({
  imports: [
    OrderModule,
    WishlistModule,
    ProductModule,
    CartModule,
    CouponModule,
  ],
  exports: [
    OrderModule,
    WishlistModule,
    ProductModule,
    CartModule,
    CouponModule,
  ],
})
export class CommerceModule {}
