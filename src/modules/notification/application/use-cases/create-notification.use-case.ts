import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../infrastructure/persistence/entities/notification.entity';
import { NotificationGateway } from '../../api/gateways/notification.gateway';

@Injectable()
export class CreateNotificationUseCase {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,
        private readonly notificationGateway: NotificationGateway,
    ) { }

    async execute(
        userId: number,
        type: NotificationType,
        title: string,
        message: string,
        metadata?: any,
    ) {
        const notification = this.notificationRepo.create({
            user_id: userId,
            type,
            title,
            message,
            metadata,
        });
        const savedNotification = await this.notificationRepo.save(notification);

        // Emit real-time notification via WebSocket
        try {
            this.notificationGateway.emitToUser(userId, 'new_notification', savedNotification);
        } catch (err) {
            console.error(`[CreateNotification] Failed to emit via socket:`, err);
        }

        return savedNotification;
    }
}
