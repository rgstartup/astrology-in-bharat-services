import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ProductModule } from './product/product.module';

@Module({
    imports: [OrderModule, WishlistModule, ProductModule],
    exports: [OrderModule, WishlistModule, ProductModule]
})
export class CommerceModule {}
