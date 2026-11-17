import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, ProfileType } from '../entities/notification.entity';
import { FindOptionsWhere, FindOptionsOrder } from 'typeorm';
import { RoleEnum } from '../../users/enums/Role.enum';
import { GetNotificationsDto } from '../dto/get-notifications.dto';
import { parseSort } from '@/shared/sorting/sort.parser';

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
    const { limit, offset } = dto;
    const where = this.buildWhere(profileId, profileType);

    const sortOptions = parseSort(dto.sort);
    const defaultOrder: FindOptionsOrder<Notification> = {
      created_at: 'DESC',
    };
    const order: FindOptionsOrder<Notification> = sortOptions.length > 0
      ? Object.fromEntries(
          sortOptions.map(({ field, direction }) => [field, direction]),
        ) as FindOptionsOrder<Notification>
      : defaultOrder;

    const [data, totalCount] = await this.notificationRepo.findAndCount({
      where,
      order,
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
