import { Module } from '@nestjs/common';
import { ClientNotificationController } from './controllers/notification.controller';
import { ClientNotificationService } from './notification.service';
import { GetClientNotificationsUseCase } from './use-cases/get-client-notifications.usecase';
import { GetClientUnreadCountUseCase } from './use-cases/get-client-unread-count.usecase';
import { MarkClientNotificationAsReadUseCase } from './use-cases/mark-client-notification-as-read.usecase';
import { ClearClientNotificationsUseCase } from './use-cases/clear-client-notifications.usecase';

@Module({
  controllers: [ClientNotificationController],
  providers: [
    ClientNotificationService,
    GetClientNotificationsUseCase,
    GetClientUnreadCountUseCase,
    MarkClientNotificationAsReadUseCase,
    ClearClientNotificationsUseCase,
  ],
  exports: [ClientNotificationService],
})
export class ClientNotificationModule {}
