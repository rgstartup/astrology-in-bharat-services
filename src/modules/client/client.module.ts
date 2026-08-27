import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import { ClientNotificationModule } from './notification/notification.module';
import { CommerceModule } from './commerce/commerce.module';

@Module({
  imports: [
    AccountModule,
    AuthModule,
    ClientNotificationModule,
    CommerceModule,
  ],
  exports: [
    AccountModule,
    AuthModule,
    ClientNotificationModule,
    CommerceModule,
  ],
})
export class ClientModule {}
