import { Module } from '@nestjs/common';
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

@Module({
  imports: [
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
  ]
})
export class AppModule { }
