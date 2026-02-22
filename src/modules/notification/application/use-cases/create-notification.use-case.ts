import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../infrastructure/persistence/entities/notification.entity';

@Injectable()
export class CreateNotificationUseCase {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,
    ) { }

    async execute(
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
}
