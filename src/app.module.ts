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
import { FinanceModule } from '@/modules/finance/finance.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { FestivalModule } from '@/modules/festival/festival.module';
import { MatchmakingModule } from '@/modules/matchmaking/matchmaking.module';
import { QuotesModule } from '@/modules/quotes/quotes.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { SupportModule } from '@/modules/support/support.module';
import { AgentModule } from '@/modules/agent/agent.module';
import { AstrologyModule } from '@/modules/astrology/astrology.module';
import { CalendarModule } from '@/modules/calendar/calendar.module';
import { PlacesModule } from '@/modules/places/places.module';
import { LocationsModule } from '@/modules/locations/locations.module';
import { PujaAppointmentModule } from '@/modules/puja-appointment/puja-appointment.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { ConsultationModule } from './modules/consultation/consultation.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { EmailWorkerModule } from './workers/email/email-worker.module';
import { APP_GUARD } from '@nestjs/core';
import { BlockStatusGuard } from '@/common/guards/block-status.guard';

import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
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
    FinanceModule,
    NotificationModule,
    PaymentModule,
    FestivalModule,
    MatchmakingModule,
    QuotesModule,
    AdminModule,
    SupportModule,
    AgentModule,
    AstrologyModule,
    PlacesModule,
    LocationsModule,
    CalendarModule,
    PujaAppointmentModule,
    MerchantModule,
    ConsultationModule,
    CommerceModule,
    EmailWorkerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: BlockStatusGuard,
    },
  ],
})
export class AppModule {}
