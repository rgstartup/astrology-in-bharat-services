import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  ProfileType,
} from '../../infrastructure/entities/notification.entity';
import { FindOptionsWhere } from 'typeorm';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class GetNotificationsUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async execute(profileId: string, profileType: ProfileType, limit?: number, offset?: number) {
    const where = this.buildWhere(profileId, profileType);
    const [data, totalCount] = await this.notificationRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { data, totalCount };
  }

  async getUnreadCount(profileId: string, profileType: ProfileType) {
    const where = this.buildWhere(profileId, profileType);
    return this.notificationRepo.count({ where: { ...where, is_read: false } });
  }

  private buildWhere(
    profileId: string,
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
    }
  }
}
