import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '@/modules/order/infrastructure/persistence/entities/order-item.entity';
import { Product } from '@/modules/product/infrastructure/persistence/entities/product.entity';
import { Review } from '@/modules/reviews/infrastructure/persistence/entities/review.entity';
import { MerchantDashboardController } from './api/controllers/merchant-dashboard.controller';
import { GetMerchantStatsUseCase } from './application/use-cases/get-merchant-stats.usecase';
import { GetRecentOrdersUseCase } from './application/use-cases/get-recent-orders.usecase';
import { GetMerchantActivityUseCase } from './application/use-cases/get-merchant-activity.usecase';
import { GetMerchantPerformanceUseCase } from './application/use-cases/get-merchant-performance.usecase';
import { MerchantProductsUseCase } from './application/use-cases/merchant-products.usecase';
import { MerchantProductsController } from './api/controllers/merchant-products.controller';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItem, Product, Review]),
    ProfileModule,
  ],
  controllers: [MerchantDashboardController, MerchantProductsController],
  providers: [
    GetMerchantStatsUseCase,
    GetRecentOrdersUseCase,
    GetMerchantActivityUseCase,
    GetMerchantPerformanceUseCase,
    MerchantProductsUseCase,
  ],
})
export class MerchantDashboardModule {}
