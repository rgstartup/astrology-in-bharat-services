import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { CoreModule } from '@/core/core.module';
import { CommonModule } from '@/common/common.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CartModule } from '@/modules/cart/cart.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { ClientModule } from '@/modules/client/client.module';
import { CouponModule } from '@/modules/coupon/coupon.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { FestivalModule } from '@/modules/festival/festival.module';
import { MatchmakingModule } from '@/modules/matchmaking/matchmaking.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { OrderModule } from '@/modules/order/order.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { ProductModule } from '@/modules/product/product.module';
import { QuotesModule } from '@/modules/quotes/quotes.module';
import { ReviewsModule } from '@/modules/reviews/reviews.module';
import { RolesModule } from '@/modules/role/roles.module';
import { UsersModule } from '@/modules/users/users.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { WishlistModule } from '@/modules/wishlist/wishlist.module';
import { SettingsModule } from '@/modules/settings/settings.module';
import { SupportModule } from '@/modules/support/support.module';
import { LiveSessionModule } from '@/modules/liveSession/live-session.module';
import { AgentModule } from '@/modules/agent/agent.module';

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
    SettingsModule,
    SupportModule,
    LiveSessionModule,
    AgentModule,

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
