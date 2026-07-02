import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  ProfileType,
} from '../../infrastructure/entities/notification.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class ClearAllNotificationsUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async execute(profileId: string, profileType: ProfileType) {
    switch (profileType) {
      case RoleEnum.CLIENT:
        await this.notificationRepo.delete({ client_id: profileId });
        break;
      case RoleEnum.EXPERT:
        await this.notificationRepo.delete({ expert_id: profileId });
        break;
      case RoleEnum.MERCHANT:
        await this.notificationRepo.delete({ merchant_id: profileId });
        break;
      case RoleEnum.AGENT:
        await this.notificationRepo.delete({ agent_id: profileId });
        break;
    }
    return new BooleanMessage();
  }
}
