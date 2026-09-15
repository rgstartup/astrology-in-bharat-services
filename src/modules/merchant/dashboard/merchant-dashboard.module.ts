import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantDashboardController } from './controllers/merchant-dashboard.controller';
import { GetMerchantStatsUseCase } from './use-cases/get-merchant-stats.usecase';
import { GetRecentOrdersUseCase } from './use-cases/get-recent-orders.usecase';
import { GetMerchantOrdersUseCase } from './use-cases/get-merchant-orders.usecase';
import { GetMerchantActivityUseCase } from './use-cases/get-merchant-activity.usecase';
import { GetMerchantPerformanceUseCase } from './use-cases/get-merchant-performance.usecase';
import { GetMerchantAnalyticsUseCase } from './use-cases/get-merchant-analytics.usecase';
import { VerifyOrderOtpUseCase } from './use-cases/verify-order-otp.usecase';
import { GetMerchantFinanceStatsUseCase } from './use-cases/get-merchant-finance-stats.usecase';
import { SendOrderOtpUseCase } from './use-cases/send-order-otp.usecase';
import { CalculateMerchantEarningsUseCase } from './use-cases/calculate-merchant-earnings.usecase';
import { MerchantProductsController } from './controllers/merchant-products.controller';
import { MerchantFinanceController } from './controllers/merchant-finance.controller';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { CommissionsModule } from '@/modules/finance/commissions/commissions.module';
import { OrderModule } from '@/modules/commerce/order/order.module';
import { ProductModule } from '@/modules/commerce/product/product.module';
import { ConsultationModule } from '@/modules/consultation/consultation.module';
import { MerchantAccount } from '@/modules/merchant/account/entities/account.entity';
import { MerchantAccountModule } from '../account/account.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { NodemailerModule } from '@/external/nodemailer/nodemailer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantAccount]),
    forwardRef(() => WalletModule),
    CommissionsModule,
    forwardRef(() => OrderModule),
    ProductModule,
    forwardRef(() => ConsultationModule),
    forwardRef(() => MerchantAccountModule),
    NotificationModule,
    NodemailerModule,
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
    GetMerchantAnalyticsUseCase,
    VerifyOrderOtpUseCase,
    GetMerchantFinanceStatsUseCase,
    SendOrderOtpUseCase,
    CalculateMerchantEarningsUseCase,
  ],
})
export class MerchantDashboardModule {}
