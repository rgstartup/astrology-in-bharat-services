import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../infrastructure/persistence/entities/notification.entity';

@Injectable()
export class MarkAsReadUseCase {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,
    ) { }

    async execute(id: number, userId: number) {
        await this.notificationRepo.update({ id, user_id: userId }, { is_read: true });
        return this.notificationRepo.findOne({ where: { id } });
    }
}
