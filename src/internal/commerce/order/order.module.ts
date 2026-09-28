import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderShipment } from './entities/order-shipment.entity';
import { OrderPayment } from './entities/order-payment.entity';
import { OrderRefund } from './entities/order-refund.entity';
import { OrderAddress } from './entities/order-address.entity';
import { QueueModule } from '@/core/queue/queue.module';
import { SystemSetting } from '@/internal/admin/entities/system-setting.entity';

import {
  OrderController,
  OrderSingularController,
} from './controllers/order.controller';
import { OrderService } from './order.service';
import { CreateOrderFromCartUseCase } from './use-cases/create-order-from-cart.use-case';
import { MarkOrderAsPaidUseCase } from './use-cases/mark-order-as-paid.use-case';
import { SetOrderRazorpayIdUseCase } from './use-cases/set-order-razorpay-id.use-case';
import { GetUserOrdersUseCase } from './use-cases/get-user-orders.use-case';
import { GetOrderByIdUseCase } from './use-cases/get-order-by-id.use-case';
import { UpdateOrderStatusUseCase } from './use-cases/update-order-status.use-case';
import { CancelUserOrderUseCase } from './use-cases/cancel-user-order.use-case';
import { FindAllOrdersUseCase } from './use-cases/find-all-orders.use-case';
import { GetOrderEarningsUseCase } from './use-cases/get-order-earnings.use-case';
import { MerchantOrderQueriesUseCase } from './use-cases/merchant-order-queries.use-case';
import { GetAdminMerchantSalesOverviewUseCase } from './use-cases/get-admin-merchant-sales-overview.use-case';
import { GetAdminMerchantSalesDetailsUseCase } from './use-cases/get-admin-merchant-sales-details.use-case';
import { CartModule } from '@/internal/domains/client/cart/cart.module';
import { NotificationModule } from '@/internal/notification/notification.module';
import { UsersModule } from '@/internal/users/users.module';
import { Product } from '@/internal/commerce/product/entities/product.entity';
import { WalletModule } from '@/internal/finance/wallet/wallet.module';
import { CouponModule } from '@/internal/commerce/coupon/coupon.module';
import { ProductModule } from '@/internal/commerce/product/product.module';
import { NodemailerModule } from '@/external/nodemailer/nodemailer.module';
import { AdminModule } from '@/internal/admin/admin.module';
import { PujaAppointmentModule } from '@/internal/puja-appointment/puja-appointment.module';
import { AccountModule } from '@/internal/domains/client/account/account.module';
import { MerchantAccountModule } from '@/internal/domains/merchant/account/account.module';
import { OrderService as OrderDomainService } from './services/order.service';
import { WalletModule as ClientWalletModule } from '@/internal/domains/client/wallet/wallet.module';
import { PaymentGatewayModule } from '@/internal/finance/payments/payments.module';
import { ProductPurchaseIntentHandler } from './handlers/product-purchase-intent.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderShipment,
      OrderPayment,
      OrderRefund,
      OrderAddress,
      Product,
      SystemSetting,
    ]),
    forwardRef(() => AccountModule),
    forwardRef(() => PujaAppointmentModule),
    forwardRef(() => CartModule),
    forwardRef(() => ProductModule),
    NotificationModule,
    UsersModule,
    NodemailerModule,
    forwardRef(() => WalletModule),
    forwardRef(() => ClientWalletModule),
    forwardRef(() => CouponModule),
    forwardRef(() => AdminModule),
    forwardRef(() => MerchantAccountModule),
    forwardRef(() => PaymentGatewayModule),
    QueueModule,
  ],
  controllers: [OrderController, OrderSingularController],
  providers: [
    OrderService,
    OrderDomainService,
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
    ProductPurchaseIntentHandler,
  ],
  exports: [OrderService, GetOrderEarningsUseCase],
})
export class OrderModule {}
