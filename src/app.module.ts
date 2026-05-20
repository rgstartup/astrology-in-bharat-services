import { Module } from '@nestjs/common'; // Force re-sync of entities
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

import configs from './config';
import { UsersModule } from '@/modules/users/users.module';
import { CoreModule } from '@/core/core.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { ClientModule } from '@/modules/client/client.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { ExternalModule } from './external/external.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { FestivalModule } from '@/modules/festival/festival.module';
import { MatchmakingModule } from '@/modules/matchmaking/matchmaking.module';
import { QuotesModule } from '@/modules/quotes/quotes.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { SupportModule } from '@/modules/support/support.module';
import { LiveDarshanModule } from '@/modules/live-darshan/live-darshan.module';
import { AgentModule } from '@/modules/agent/agent.module';
import { AstrologyModule } from '@/modules/astrology/astrology.module';
import { CalendarModule } from '@/modules/calendar/calendar.module';
import { PlacesModule } from '@/modules/places/places.module';
import { PujaAppointmentModule } from '@/modules/puja-appointment/puja-appointment.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { ConsultationModule } from './modules/consultation/consultation.module';
import { CommerceModule } from './modules/commerce/commerce.module';
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
    ClientModule,
    ExpertModule,
    ExternalModule,
    WalletModule,
    NotificationModule,
    PaymentModule,
    FestivalModule,
    MatchmakingModule,
    QuotesModule,
    AdminModule,
    SupportModule,
    LiveDarshanModule,
    AgentModule,
    AstrologyModule,
    PlacesModule,
    CalendarModule,
    PujaAppointmentModule,
    MerchantModule,
    ConsultationModule,
    CommerceModule,
  ]
})
export class AppModule { }
