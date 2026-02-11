import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '@/common/common.module';
import { CartModule } from '@/modules/cart/cart.module';
import { CouponModule } from '@/modules/coupon/coupon.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { ProductModule } from '@/modules/product/product.module';
import { User } from '@/modules/users/domain/entities/user.entity';
import { OrderService } from './application/services/order.service';
import { OrderItem } from './domain/entities/order-item.entity';
import { Order } from './domain/entities/order.entity';
import { IOrderRepository, IOrderItemRepository } from './domain/repositories/order.repository.interface';
import { TypeOrmOrderRepository, TypeOrmOrderItemRepository } from './infrastructure/persistence/typeorm-order.repository';
import { OrderController, OrderSingularController } from './interfaces/controllers/order.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem, User]),
        CartModule,
        NotificationModule,
        CommonModule,
        CouponModule,
        WalletModule,
        ProductModule,
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

