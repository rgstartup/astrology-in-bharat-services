import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartModule } from '@/modules/cart/cart.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem]),
        CartModule,
    ],
    providers: [OrderService],
    controllers: [OrderController],
    exports: [OrderService],
})
export class OrderModule { }
