import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './infrastructure/entities/order.entity';
import { OrderItem } from './infrastructure/entities/order-item.entity';
import {
  OrderController,
  OrderSingularController,
} from './api/controllers/order.controller';
import { OrderFacade } from './application/order.facade';
import { CreateOrderFromCartUseCase } from './application/use-cases/create-order-from-cart.use-case';
import { MarkOrderAsPaidUseCase } from './application/use-cases/mark-order-as-paid.use-case';
import { SetOrderRazorpayIdUseCase } from './application/use-cases/set-order-razorpay-id.use-case';
import { GetUserOrdersUseCase } from './application/use-cases/get-user-orders.use-case';
import { GetOrderByIdUseCase } from './application/use-cases/get-order-by-id.use-case';
import { UpdateOrderStatusUseCase } from './application/use-cases/update-order-status.use-case';
import { CancelUserOrderUseCase } from './application/use-cases/cancel-user-order.use-case';
import { FindAllOrdersUseCase } from './application/use-cases/find-all-orders.use-case';
import { GetOrderEarningsUseCase } from './application/use-cases/get-order-earnings.use-case';
import { MerchantOrderQueriesUseCase } from './application/use-cases/merchant-order-queries.use-case';
import { GetAdminMerchantSalesOverviewUseCase } from './application/use-cases/get-admin-merchant-sales-overview.use-case';
import { GetAdminMerchantSalesDetailsUseCase } from './application/use-cases/get-admin-merchant-sales-details.use-case';
import { CartModule } from '@/modules/commerce/cart/cart.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { UsersModule } from '@/modules/users/users.module';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { CouponModule } from '@/modules/commerce/coupon/coupon.module';
import { ProductModule } from '@/modules/commerce/product/product.module';
import { NodemailerModule } from '@/external/nodemailer/nodemailer.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { PujaAppointmentModule } from '@/modules/puja-appointment/puja-appointment.module';
import { ProfileModule as ClientProfileModule } from '@/modules/client/profile/profile.module';
import { ProfileModule as MerchantProfileModule } from '@/modules/merchant/profile/profile.module';
import { QueueModule } from '@/core/queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product]),
    forwardRef(() => ClientProfileModule),
    forwardRef(() => PujaAppointmentModule),
    forwardRef(() => CartModule),
    forwardRef(() => ProductModule),
    NotificationModule,
    UsersModule,
    NodemailerModule,
    forwardRef(() => WalletModule),
    forwardRef(() => CouponModule),
    forwardRef(() => AdminModule),
    forwardRef(() => MerchantProfileModule),
    QueueModule,
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
    CancelUserOrderUseCase,
    FindAllOrdersUseCase,
    GetOrderEarningsUseCase,
    MerchantOrderQueriesUseCase,
    GetAdminMerchantSalesOverviewUseCase,
    GetAdminMerchantSalesDetailsUseCase,
  ],
  exports: [OrderFacade, GetOrderEarningsUseCase],
})
export class OrderModule {}
