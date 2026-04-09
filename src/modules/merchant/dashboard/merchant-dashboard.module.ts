import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '@/modules/order/infrastructure/persistence/entities/order-item.entity';
import { Product } from '@/modules/product/infrastructure/persistence/entities/product.entity';
import { Review } from '@/modules/reviews/infrastructure/persistence/entities/review.entity';
import { MerchantDashboardController } from './api/controllers/merchant-dashboard.controller';
import { GetMerchantStatsUseCase } from './application/use-cases/get-merchant-stats.usecase';
import { GetRecentOrdersUseCase } from './application/use-cases/get-recent-orders.usecase';
import { GetMerchantOrdersUseCase } from './application/use-cases/get-merchant-orders.usecase';
import { GetMerchantActivityUseCase } from './application/use-cases/get-merchant-activity.usecase';
import { GetMerchantPerformanceUseCase } from './application/use-cases/get-merchant-performance.usecase';
import { MerchantProductsUseCase } from './application/use-cases/merchant-products.usecase';
import { VerifyOrderOtpUseCase } from './application/use-cases/verify-order-otp.usecase';
import { GetMerchantFinanceStatsUseCase } from './application/use-cases/get-merchant-finance-stats.usecase';
import { GetMerchantTransactionsUseCase } from './application/use-cases/get-merchant-transactions.usecase';
import { MerchantProductsController } from './api/controllers/merchant-products.controller';
import { MerchantFinanceController } from './api/controllers/merchant-finance.controller';
import { Order } from '@/modules/order/infrastructure/persistence/entities/order.entity';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { OrderModule } from '@/modules/order/order.module';
import { Transaction } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';
import { Wallet } from '@/modules/wallet/infrastructure/persistence/entities/wallet.entity';
import { Withdrawal } from '@/modules/wallet/infrastructure/persistence/entities/withdrawal.entity';

import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/persistence/entities/profile-merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderItem,
      Product,
      Review,
      Order,
      Transaction,
      Wallet,
      Withdrawal,
      ProfileMerchant,
    ]),
    WalletModule,
    OrderModule,
  ],
  controllers: [
    MerchantDashboardController,
    MerchantProductsController,
    MerchantFinanceController,
  ],
  providers: [
    GetMerchantStatsUseCase,
    GetRecentOrdersUseCase,
    GetMerchantOrdersUseCase,
    GetMerchantActivityUseCase,
    GetMerchantPerformanceUseCase,
    MerchantProductsUseCase,
    VerifyOrderOtpUseCase,
    GetMerchantFinanceStatsUseCase,
    GetMerchantTransactionsUseCase,
  ],
})
export class MerchantDashboardModule {}
