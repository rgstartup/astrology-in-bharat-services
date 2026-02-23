import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../infrastructure/persistence/entities/notification.entity';

@Injectable()
export class GetNotificationsUseCase {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,
    ) { }

    async execute(userId: number) {
        return this.notificationRepo.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
        });
    }

    async getUnreadCount(userId: number) {
        return this.notificationRepo.count({
            where: { user_id: userId, is_read: false },
        });
    }
}
