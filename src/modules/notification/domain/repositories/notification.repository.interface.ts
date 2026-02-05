import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../entities/notification.entity';

export interface INotificationRepository {
    create(data: {
        userId: number;
        type: NotificationType;
        title: string;
        message: string;
        metadata?: any;
    }): Notification;
    save(notification: Notification): Promise<Notification>;
    find(options: any): Promise<Notification[]>;
    findOne(options: any): Promise<Notification | null>;
    update(criteria: any, data: any): Promise<any>;
    count(options: any): Promise<number>;
}

export const INotificationRepository = Symbol('INotificationRepository');
