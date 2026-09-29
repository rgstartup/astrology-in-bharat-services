import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import { ClientNotificationModule } from './notification/notification.module';
import { FavoritesModule } from './favorites/favorites.module';
import { WalletModule } from './wallet/wallet.module';
import { ClientPaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    AccountModule,
    AuthModule,
    ClientNotificationModule,
    FavoritesModule,
    WalletModule,
    ClientPaymentsModule,
  ],
  exports: [
    AccountModule,
    AuthModule,
    ClientNotificationModule,
    FavoritesModule,
    WalletModule,
    ClientPaymentsModule,
  ],
})
export class ClientModule {}
