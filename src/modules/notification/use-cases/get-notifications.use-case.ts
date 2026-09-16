import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  ProfileType,
} from '../entities/notification.entity';
import { FindOptionsWhere } from 'typeorm';
import { RoleEnum } from '@/modules/users/enums/Role.enum';
import { GetNotificationsDto } from '../dto/get-notifications.dto';

@Injectable()
export class GetNotificationsUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async execute(
    profileId: number,
    profileType: ProfileType,
    dto: GetNotificationsDto,
  ) {
    const { limit = 20, offset = 0 } = dto;
    const where = this.buildWhere(profileId, profileType);
    const [data, totalCount] = await this.notificationRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { data, totalCount };
  }

  async getUnreadCount(profileId: number, profileType: ProfileType) {
    const where = this.buildWhere(profileId, profileType);
    return this.notificationRepo.count({ where: { ...where, is_read: false } });
  }

  private buildWhere(
    profileId: number,
    profileType: ProfileType,
  ): FindOptionsWhere<Notification> {
    switch (profileType) {
      case RoleEnum.CLIENT:
        return { client_id: profileId };
      case RoleEnum.EXPERT:
        return { expert_id: profileId };
      case RoleEnum.MERCHANT:
        return { merchant_id: profileId };
      case RoleEnum.AGENT:
        return { agent_id: profileId };
      default:
        return {};
    }
  }
}
