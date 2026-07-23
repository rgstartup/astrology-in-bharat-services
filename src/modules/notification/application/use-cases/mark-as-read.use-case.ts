import { Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  ProfileType,
} from '../../infrastructure/entities/notification.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class MarkAsReadUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async execute(id: string, profileId?: string, profileType?: ProfileType) {
    if (profileId && profileType) {
      const whereClause: Record<string, unknown> = { id };
      switch (profileType) {
        case RoleEnum.CLIENT:
          whereClause.client_id = profileId;
          break;
        case RoleEnum.EXPERT:
          whereClause.expert_id = profileId;
          break;
        case RoleEnum.MERCHANT:
          whereClause.merchant_id = profileId;
          break;
        case RoleEnum.AGENT:
          whereClause.agent_id = profileId;
          break;
      }
      await this.notificationRepo.update(whereClause, { is_read: true });
    } else if (profileId) {
      const notification = await this.notificationRepo.findOne({ where: { id } });
      if (!notification) {
        throw new NotFoundException('Notification not found');
      }
      if (
        notification.client_id === profileId ||
        notification.expert_id === profileId ||
        notification.merchant_id === profileId ||
        notification.agent_id === profileId
      ) {
        await this.notificationRepo.update({ id }, { is_read: true });
      } else {
        throw new NotFoundException('Notification not found for this profile');
      }
    } else {
      await this.notificationRepo.update({ id }, { is_read: true });
    }
    return new BooleanMessage();
  }
}
