import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './domain/entities/order.entity';
import { OrderItem } from './domain/entities/order-item.entity';
import { User } from '@/modules/users';
import { OrderService } from './application/services/order.service';
import { OrderController, OrderSingularController } from './interfaces/controllers/order.controller';
import { CartModule } from '@/modules/cart/cart.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { CommonModule } from '@/common/common.module';
import { CouponModule } from '@/modules/coupon/coupon.module';
import { IOrderRepository, IOrderItemRepository } from './domain/repositories/order.repository.interface';
import { TypeOrmOrderRepository, TypeOrmOrderItemRepository } from './infrastructure/persistence/typeorm-order.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem, User]),
        CartModule,
        NotificationModule,
        CommonModule,
        CouponModule,
    ],
    controllers: [OrderController, OrderSingularController],
    providers: [
        OrderService,
        {
            provide: IOrderRepository,
            useClass: TypeOrmOrderRepository,
        },
        {
            provide: IOrderItemRepository,
            useClass: TypeOrmOrderItemRepository,
        },
    ],
    exports: [OrderService],
})
export class OrderModule { }

