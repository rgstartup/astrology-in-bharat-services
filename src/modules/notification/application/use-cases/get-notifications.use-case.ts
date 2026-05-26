import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../infrastructure/entities/notification.entity';

@Injectable()
export class GetNotificationsUseCase {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,
    ) { }

    async execute(userId: string, limit?: number, offset?: number) {
        const [data, totalCount] = await this.notificationRepo.findAndCount({
            where: { client_id: userId as any },
            order: { created_at: 'DESC' },
            take: limit,
            skip: offset,
        });

        return { data, totalCount };
    }

    async getUnreadCount(userId: string) {
        return this.notificationRepo.count({
            where: { client_id: userId as any, is_read: false },
        });
    }
}
