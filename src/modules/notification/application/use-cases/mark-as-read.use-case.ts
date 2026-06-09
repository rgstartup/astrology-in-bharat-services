import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../infrastructure/entities/notification.entity';

@Injectable()
export class MarkAsReadUseCase {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,
    ) { }

    async execute(id: string, userId: string) {
     const updateResult = await this.notificationRepo.update(
      { id }, // Removed user_id as it was removed from entity
      { is_read: true },
    );
    return new BooleanMessage();
    }
}
