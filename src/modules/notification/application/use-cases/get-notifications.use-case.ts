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

    async execute(userId: number, limit?: number, offset?: number) {
        const [data, totalCount] = await this.notificationRepo.findAndCount({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
            take: limit,
            skip: offset,
        });

        return { data, totalCount };
    }

    async getUnreadCount(userId: number) {
        return this.notificationRepo.count({
            where: { user_id: userId, is_read: false },
        });
    }
}
