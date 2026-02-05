import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './domain/entities/notification.entity';
import { NotificationService } from './application/services/notification.service';
import { EmailNotificationService } from './application/services/email-notification.service';
import { MailService } from './application/services/mail.service';
import { NotificationController } from './interfaces/controllers/notification.controller';
import { NotificationGateway } from './interfaces/gateways/notification.gateway';
import { INotificationRepository } from './domain/repositories/notification.repository.interface';
import { TypeOrmNotificationRepository } from './infrastructure/persistence/typeorm-notification.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Notification])],
    controllers: [NotificationController],
    providers: [
        NotificationService,
        EmailNotificationService,
        MailService,
        NotificationGateway,
        {
            provide: INotificationRepository,
            useClass: TypeOrmNotificationRepository,
        },
    ],
    exports: [NotificationService, EmailNotificationService, MailService, NotificationGateway],
})
export class NotificationModule { }
