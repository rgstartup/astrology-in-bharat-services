import { Module } from "@nestjs/common";
import { AccountModule } from "./account/account.module";
import { AuthModule } from "./auth/auth.module";
import { ClientNotificationModule } from "./notification/notification.module";
import { FavoritesModule } from "./favorites/favorites.module";
import { WalletModule } from "./wallet/wallet.module";
import { ClientPaymentsModule } from "./payments/payments.module";
import { ClientConsultationModule } from "./consultation/consultations.module";
import { ClientRealtimeModule } from "./realtime/client-realtime.module";

@Module({
  imports: [
    AccountModule,
    AuthModule,
    ClientNotificationModule,
    FavoritesModule,
    WalletModule,
    ClientPaymentsModule,
    ClientConsultationModule,
    ClientRealtimeModule,
  ],
  exports: [
    AccountModule,
    AuthModule,
    ClientNotificationModule,
    FavoritesModule,
    WalletModule,
    ClientPaymentsModule,
    ClientConsultationModule,
    ClientRealtimeModule,
  ],
})
export class ClientModule {}
