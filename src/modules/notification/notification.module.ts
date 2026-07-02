import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './infrastructure/entities/notification.entity';
import { NotificationController } from './api/controllers/notification.controller';
import { NotificationGateway } from './api/gateways/notification.gateway';
import { NotificationFacade } from './application/notification.facade';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
import { GetNotificationsUseCase } from './application/use-cases/get-notifications.use-case';
import { MarkAsReadUseCase } from './application/use-cases/mark-as-read.use-case';
import { ClearAllNotificationsUseCase } from './application/use-cases/clear-all-notifications.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [
    NotificationGateway,
    NotificationFacade,
    CreateNotificationUseCase,
    GetNotificationsUseCase,
    MarkAsReadUseCase,
    ClearAllNotificationsUseCase,
  ],
  exports: [NotificationFacade, NotificationGateway],
})
export class NotificationModule {}
