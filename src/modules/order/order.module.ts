import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController, OrderSingularController } from './order.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartModule } from '@/modules/cart/cart.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { User } from '@/modules/users/entities/user.entity';
import { CouponModule } from '@/modules/coupon/coupon.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem, User]),
        CartModule,
        NotificationModule,
        CouponModule,
    ],
    providers: [OrderService],
    controllers: [OrderController, OrderSingularController],
    exports: [OrderService],
})
export class OrderModule { }
