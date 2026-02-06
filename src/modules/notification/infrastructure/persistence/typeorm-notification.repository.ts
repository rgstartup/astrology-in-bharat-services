import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '@/modules/notification/domain/entities/notification.entity';
import { NotificationType } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories/notification.repository.interface';

@Injectable()
export class TypeOrmNotificationRepository implements INotificationRepository {
    constructor(
        @InjectRepository(Notification)
        private readonly repository: Repository<Notification>,
    ) { }

    create(data: {
        userId: number;
        type: NotificationType;
        title: string;
        message: string;
        metadata?: any;
    }): Notification {
        return this.repository.create(data);
    }

    async save(notification: Notification): Promise<Notification> {
        return this.repository.save(notification);
    }

    async find(options: any): Promise<Notification[]> {
        return this.repository.find(options);
    }

    async findOne(options: any): Promise<Notification | null> {
        return this.repository.findOne(options);
    }

    async update(criteria: any, data: any): Promise<any> {
        return this.repository.update(criteria, data);
    }

    async count(options: any): Promise<number> {
        return this.repository.count(options);
    }
}
