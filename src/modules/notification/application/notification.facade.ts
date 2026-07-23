import { Injectable } from '@nestjs/common';
import { CreateNotificationUseCase } from './use-cases/create-notification.use-case';
import { GetNotificationsUseCase } from './use-cases/get-notifications.use-case';
import { MarkAsReadUseCase } from './use-cases/mark-as-read.use-case';
import { ClearAllNotificationsUseCase } from './use-cases/clear-all-notifications.use-case';
import {
  NotificationType,
  ProfileType,
} from '../infrastructure/entities/notification.entity';

import { GetNotificationsDto } from '../api/dto/get-notifications.dto';

export type { ProfileType };

@Injectable()
export class NotificationFacade {
  constructor(
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly markAsReadUseCase: MarkAsReadUseCase,
    private readonly clearAllNotificationsUseCase: ClearAllNotificationsUseCase,
  ) {}

  async create(
    profileId: string,
    profileType: ProfileType,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.createNotificationUseCase.execute(
      profileId,
      profileType,
      type,
      title,
      message,
      metadata,
    );
  }

  async getUserNotifications(
    profileId: string,
    profileType: ProfileType,
    dto: GetNotificationsDto,
  ) {
    return this.getNotificationsUseCase.execute(
      profileId,
      profileType,
      dto,
    );
  }

  async markAsRead(id: string, profileId?: string, profileType?: ProfileType) {
    return this.markAsReadUseCase.execute(id, profileId, profileType);
  }

  async getUnreadCount(profileId: string, profileType: ProfileType) {
    return this.getNotificationsUseCase.getUnreadCount(profileId, profileType);
  }

  async clearAll(profileId: string, profileType: ProfileType) {
    return this.clearAllNotificationsUseCase.execute(profileId, profileType);
  }
}
