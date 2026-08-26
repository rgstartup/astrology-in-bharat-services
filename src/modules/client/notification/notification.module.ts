import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '@/modules/notification/infrastructure/entities/notification.entity';
import { ClientNotificationController } from './controllers/notification.controller';
import { ClientNotificationFacade } from './notification.facade';
import { GetClientNotificationsUseCase } from './use-cases/get-client-notifications.usecase';
import { GetClientUnreadCountUseCase } from './use-cases/get-client-unread-count.usecase';
import { MarkClientNotificationAsReadUseCase } from './use-cases/mark-client-notification-as-read.usecase';
import { ClearClientNotificationsUseCase } from './use-cases/clear-client-notifications.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [ClientNotificationController],
  providers: [
    ClientNotificationFacade,
    GetClientNotificationsUseCase,
    GetClientUnreadCountUseCase,
    MarkClientNotificationAsReadUseCase,
    ClearClientNotificationsUseCase,
  ],
  exports: [ClientNotificationFacade],
})
export class ClientNotificationModule {}
