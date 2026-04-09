import { Module } from '@nestjs/common'; // Triggering rebuild
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

import configs from './config';
import { UsersModule } from '@/modules/users/users.module';
import { CoreModule } from '@/core/core.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { RolesModule } from '@/modules/role/roles.module';
import { ClientModule } from '@/modules/client/client.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { ExternalModule } from './external/external.module';
import { ProductModule } from '@/modules/product/product.module';
import { CartModule } from '@/modules/cart/cart.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { OrderModule } from '@/modules/order/order.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { ReviewsModule } from '@/modules/reviews/reviews.module';
import { WishlistModule } from '@/modules/wishlist/wishlist.module';
import { FestivalModule } from '@/modules/festival/festival.module';
import { MatchmakingModule } from '@/modules/matchmaking/matchmaking.module';
import { QuotesModule } from '@/modules/quotes/quotes.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { SupportModule } from '@/modules/support/support.module';
import { CallModule } from '@/modules/call/call.module';
import { LiveDarshanModule } from '@/modules/live-darshan/live-darshan.module';
import { AgentModule } from '@/modules/agent/agent.module';
import { CouponModule } from '@/modules/coupon/coupon.module';
import { AstrologyModule } from '@/modules/astrology/astrology.module';
import { CalendarModule } from '@/modules/calendar/calendar.module';
import { PlacesModule } from '@/modules/places/places.module';
import { PujaAppointmentModule } from '@/modules/puja-appointment/puja-appointment.module';
import { MerchantModule } from './modules/merchant/merchant.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({

      isGlobal: true,
      envFilePath: '.env',
      load: configs,
    }),
    UsersModule,
    CoreModule,
    AuthModule,
    RolesModule,
    ClientModule,
    ExpertModule,
    ExternalModule,
    ProductModule,
    CartModule,
    ChatModule,
    WalletModule,
    NotificationModule,
    OrderModule,
    PaymentModule,
    ReviewsModule,
    WishlistModule,
    FestivalModule,
    MatchmakingModule,
    QuotesModule,
    AdminModule,
    SupportModule,
    CallModule,
    LiveDarshanModule,
    AgentModule,
    CouponModule,
    AstrologyModule,
    PlacesModule,
    CalendarModule,
    PujaAppointmentModule,
    MerchantModule,
  ]
})
export class AppModule { }
