import { Injectable, Inject } from '@nestjs/common';
import { Notification } from '@/modules/notification/domain/entities/notification.entity';
import { NotificationType } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories/notification.repository.interface';

@Injectable()
export class NotificationService {
    constructor(
        @Inject(INotificationRepository)
        private notificationRepo: INotificationRepository,
    ) { }

    async create(
        userId: number,
        type: NotificationType,
        title: string,
        message: string,
        metadata?: any,
    ) {
        const notification = this.notificationRepo.create({
            userId,
            type,
            title,
            message,
            metadata,
        });
        return this.notificationRepo.save(notification);
    }

    async getUserNotifications(userId: number) {
        return this.notificationRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async markAsRead(id: number, userId: number) {
        await this.notificationRepo.update({ id, userId }, { isRead: true });
        return this.notificationRepo.findOne({ where: { id } });
    }

    async getUnreadCount(userId: number) {
        return this.notificationRepo.count({
            where: { userId, isRead: false },
        });
    }
}
