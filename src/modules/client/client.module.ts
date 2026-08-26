import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import { ClientNotificationModule } from './notification/notification.module';

@Module({
  imports: [AccountModule, AuthModule, ClientNotificationModule],
  exports: [AccountModule, AuthModule, ClientNotificationModule],
})
export class ClientModule {}
