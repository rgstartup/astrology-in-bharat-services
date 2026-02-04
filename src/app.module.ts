import { Module } from '@nestjs/common';
import { UsersModule } from '@/modules/users/users.module';
import { CoreModule } from '@/core/core.module';
import { CommonModule } from '@/common/common.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { RolesModule } from '@/modules/role/roles.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { ClientModule } from '@/modules/client/client.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { ProductModule } from '@/modules/product/product.module';
import { QuotesModule } from '@/quotes/quotes.module';
import { CartModule } from '@/modules/cart/cart.module';
import { WishlistModule } from '@/modules/wishlist/wishlist.module';
import { FestivalModule } from '@/modules/festival/festival.module';
import { MatchmakingModule } from '@/modules/matchmaking/matchmaking.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { ReviewsModule } from '@/modules/reviews/reviews.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { OrderModule } from '@/modules/order/order.module';
import { CouponModule } from '@/modules/coupon/coupon.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';

@Module({
  imports: [
    UsersModule,
    CoreModule,
    CommonModule,
    AuthModule,
    RolesModule,
    NotificationModule,
    ClientModule,
    ExpertModule,
    AdminModule,
    ProductModule,
    QuotesModule,

    CartModule,
    WishlistModule,
    FestivalModule,
    MatchmakingModule,
    WalletModule,
    ChatModule,
    ReviewsModule,
    PaymentModule,
    OrderModule,
    CouponModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
