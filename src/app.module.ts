import { Module } from "@nestjs/common"; // Force re-sync of entities
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule } from "@nestjs/config";

import configs from "./config";
import { UsersModule } from "./internal/users/users.module";
import { CoreModule } from "./core/core.module";
import { AuthModule } from "./internal/auth/auth.module";
import { ClientModule } from "./internal/actors/client/client.module";
import { ExpertModule } from "./internal/actors/expert/expert.module";
import { ExternalModule } from "./external/external.module";
import { FinanceModule } from "./internal/finance/finance.module";
import { FestivalModule } from "./internal/festival/festival.module";
import { MatchmakingModule } from "./internal/matchmaking/matchmaking.module";
import { QuotesModule } from "./internal/quotes/quotes.module";
import { AdminModule } from "./internal/actors/admin/admin.module";
import { SupportModule } from "./internal/support/support.module";
import { AgentModule } from "./internal/actors/agent/agent.module";
import { AstrologyModule } from "./internal/astrology/astrology.module";
import { CalendarModule } from "./internal/calendar/calendar.module";
import { PlacesModule } from "./internal/places/places.module";
import { LocationsModule } from "./internal/locations/locations.module";
import { PujaAppointmentModule } from "./internal/puja-appointment/puja-appointment.module";
import { CommerceModule } from "./internal/commerce/commerce.module";
import { MerchantModule } from "./internal/actors/merchant/merchant.module";
import { RealtimeModule } from "./internal/realtime/realtime.module";
// import { NotificationModule } from './internal/notification/notification.module';
// import { ConsultationModule } from './internal/consultation/consultation.module';
import { EmailWorkerModule } from "./workers/email/email.module";
import { APP_GUARD } from "@nestjs/core";
import { BlockStatusGuard } from "./shared/guards/block-status.guard";

import { EventEmitterModule } from "@nestjs/event-emitter";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      load: configs,
    }),
    AuthModule,
    UsersModule,
    ClientModule,
    CommerceModule,
    ExpertModule,
    ExternalModule,
    FinanceModule,
    // NotificationModule,
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
    RealtimeModule,
    // ConsultationModule,
    EmailWorkerModule,
    CoreModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: BlockStatusGuard,
    },
  ],
})
export class AppModule {}
