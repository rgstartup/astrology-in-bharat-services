import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '@/modules/notification/infrastructure/entities/notification.entity';

@Injectable()
export class ClearClientNotificationsUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async execute(clientId: string): Promise<void> {
    await this.notificationRepo.delete({ client_id: clientId });
  }
}
