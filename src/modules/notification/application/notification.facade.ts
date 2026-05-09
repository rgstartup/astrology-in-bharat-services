import { Injectable } from '@nestjs/common';
import { CreateNotificationUseCase } from './use-cases/create-notification.use-case';
import { GetNotificationsUseCase } from './use-cases/get-notifications.use-case';
import { MarkAsReadUseCase } from './use-cases/mark-as-read.use-case';
import { ClearAllNotificationsUseCase } from './use-cases/clear-all-notifications.use-case';
import { NotificationType } from '../infrastructure/entities/notification.entity';

@Injectable()
export class NotificationFacade {
    constructor(
        private readonly createNotificationUseCase: CreateNotificationUseCase,
        private readonly getNotificationsUseCase: GetNotificationsUseCase,
        private readonly markAsReadUseCase: MarkAsReadUseCase,
        private readonly clearAllNotificationsUseCase: ClearAllNotificationsUseCase,
    ) { }

    async create(
        userId: number,
        type: NotificationType,
        title: string,
        message: string,
        metadata?: any,
    ) {
        return this.createNotificationUseCase.execute(userId, type, title, message, metadata);
    }

    async getUserNotifications(userId: number, limit?: number, offset?: number) {
        return this.getNotificationsUseCase.execute(userId, limit, offset);
    }

    async markAsRead(id: number, userId: number) {
        return this.markAsReadUseCase.execute(id, userId);
    }

    async getUnreadCount(userId: number) {
        return this.getNotificationsUseCase.getUnreadCount(userId);
    }

    async clearAll(userId: number) {
        return this.clearAllNotificationsUseCase.execute(userId);
    }
}
