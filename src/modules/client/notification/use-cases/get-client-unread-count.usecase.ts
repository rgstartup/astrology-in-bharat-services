import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '@/modules/notification/infrastructure/entities/notification.entity';

@Injectable()
export class GetClientUnreadCountUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async execute(clientId: string): Promise<number> {
    return this.notificationRepo.count({
      where: {
        client_id: clientId,
        is_read: false,
      },
    });
  }
}
