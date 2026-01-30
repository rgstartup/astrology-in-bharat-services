import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(Notification)
        private notificationRepo: Repository<Notification>,
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
