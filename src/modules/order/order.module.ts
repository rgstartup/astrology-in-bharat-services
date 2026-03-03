import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './infrastructure/persistence/entities/order.entity';
import { OrderItem } from './infrastructure/persistence/entities/order-item.entity';
import { OrderController, OrderSingularController } from './api/controllers/order.controller';
import { OrderFacade } from './application/order.facade';
import { CreateOrderFromCartUseCase } from './application/use-cases/create-order-from-cart.use-case';
import { MarkOrderAsPaidUseCase } from './application/use-cases/mark-order-as-paid.use-case';
import { SetOrderRazorpayIdUseCase } from './application/use-cases/set-order-razorpay-id.use-case';
import { GetUserOrdersUseCase } from './application/use-cases/get-user-orders.use-case';
import { GetOrderByIdUseCase } from './application/use-cases/get-order-by-id.use-case';
import { UpdateOrderStatusUseCase } from './application/use-cases/update-order-status.use-case';
import { FindAllOrdersUseCase } from './application/use-cases/find-all-orders.use-case';
import { CartModule } from '@/modules/cart/cart.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { UsersModule } from '@/modules/users/users.module';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { Product } from '@/modules/product/infrastructure/persistence/entities/product.entity';
import { ProductModule } from '@/modules/product/product.module';
import { WalletModule } from '@/modules/wallet/wallet.module';

import { NodemailerModule } from '@/external/nodemailer/nodemailer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, User, Product]),
    CartModule,
    ProductModule,
    NotificationModule,
    UsersModule,
    NodemailerModule,
    WalletModule,
  ],
  controllers: [OrderController, OrderSingularController],
  providers: [
    OrderFacade,
    CreateOrderFromCartUseCase,
    MarkOrderAsPaidUseCase,
    SetOrderRazorpayIdUseCase,
    GetUserOrdersUseCase,
    GetOrderByIdUseCase,
    UpdateOrderStatusUseCase,
    FindAllOrdersUseCase,
  ],
  exports: [OrderFacade],
})
export class OrderModule { }
