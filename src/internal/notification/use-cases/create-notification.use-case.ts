import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  ProfileType,
} from '../entities/notification.entity';
import { NotificationGateway } from '../gateways/notification.gateway';
import { RoleEnum } from '../../users/enums/Role.enum';
import {
  NotificationGateway as RealtimeNotificationGateway,
} from '@/internal/realtime/gateways/notification.gateway';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly notificationGateway: NotificationGateway,
    private readonly realtimeNotificationGateway: RealtimeNotificationGateway,
  ) {}

  async execute(
    profileId: number,
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
        String(profileId),
        'new_notification',
        savedNotification,
      );

      // Also fan-out to the modern /realtime namespace so expert dashboard
      // sockets (joined to `expert:{id}`) receive the notification live.
      if (profileType === RoleEnum.EXPERT) {
        this.realtimeNotificationGateway.emitToExpert(
          profileId,
          SOCKET_EVENTS.NOTIFICATION.NEW,
          { notification: savedNotification },
        );
      }
    } catch (err) {
      console.error(`[CreateNotification] Failed to emit via socket:`, err);
    }

    return savedNotification;
  }

  private buildProfileFk(
    profileId: number,
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
