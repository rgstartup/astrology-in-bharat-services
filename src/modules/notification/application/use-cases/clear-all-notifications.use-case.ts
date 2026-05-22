import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../infrastructure/entities/notification.entity';

@Injectable()
export class ClearAllNotificationsUseCase {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,
    ) { }

    async execute(userId: number) {
        await this.notificationRepo.delete({ client_id: userId as any });
        return { message: 'All notifications cleared successfully' };
    }
}
