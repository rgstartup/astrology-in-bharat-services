import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '@/modules/notification/infrastructure/entities/notification.entity';

@Injectable()
export class MarkClientNotificationAsReadUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async execute(id: string, clientId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id, client_id: clientId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepo.update(
      { id, client_id: clientId },
      { is_read: true },
    );
  }
}
