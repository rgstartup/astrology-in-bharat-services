import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  ProfileType,
} from '../../infrastructure/entities/notification.entity';
import { NotificationGateway } from '../../api/gateways/notification.gateway';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async execute(
    profileId: string,
    profileType: ProfileType,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    const profileFk = this.buildProfileFk(profileId, profileType);
    const notification = this.notificationRepo.create({
      ...profileFk,
      type,
      title,
      message,
      metadata,
    });
    const savedNotification = await this.notificationRepo.save(notification);

    try {
      this.notificationGateway.emitToProfile(
        profileId,
        'new_notification',
        savedNotification,
      );
    } catch (err) {
      console.error(`[CreateNotification] Failed to emit via socket:`, err);
    }

    return savedNotification;
  }

  private buildProfileFk(
    profileId: string,
    profileType: ProfileType,
  ): Partial<Notification> {
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
