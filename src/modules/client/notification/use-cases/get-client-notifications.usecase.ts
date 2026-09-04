import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '@/modules/notification/infrastructure/entities/notification.entity';
import { GetNotificationsDto } from '@/modules/notification/api/dto/get-notifications.dto';

@Injectable()
export class GetClientNotificationsUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async execute(clientId: string, dto: GetNotificationsDto) {
    const { limit = 20, offset = 0 } = dto;
    const [data, totalCount] = await this.notificationRepo.findAndCount({
      where: { client_id: clientId },
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { data, totalCount };
  }
}
