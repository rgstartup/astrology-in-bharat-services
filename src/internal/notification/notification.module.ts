import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationController } from './controllers/notification.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import { NotificationService } from './notification.service';
import { CreateNotificationUseCase } from './use-cases/create-notification.use-case';
import { GetNotificationsUseCase } from './use-cases/get-notifications.use-case';
import { MarkAsReadUseCase } from './use-cases/mark-as-read.use-case';
import { ClearAllNotificationsUseCase } from './use-cases/clear-all-notifications.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [
    NotificationGateway,
    NotificationService,
    CreateNotificationUseCase,
    GetNotificationsUseCase,
    MarkAsReadUseCase,
    ClearAllNotificationsUseCase,
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
