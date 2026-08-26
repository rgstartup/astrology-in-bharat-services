import { Injectable } from '@nestjs/common';
import { GetClientNotificationsUseCase } from './use-cases/get-client-notifications.usecase';
import { GetClientUnreadCountUseCase } from './use-cases/get-client-unread-count.usecase';
import { MarkClientNotificationAsReadUseCase } from './use-cases/mark-client-notification-as-read.usecase';
import { ClearClientNotificationsUseCase } from './use-cases/clear-client-notifications.usecase';
import { GetNotificationsDto } from '@/modules/notification/api/dto/get-notifications.dto';

@Injectable()
export class ClientNotificationFacade {
  constructor(
    private readonly getClientNotificationsUseCase: GetClientNotificationsUseCase,
    private readonly getClientUnreadCountUseCase: GetClientUnreadCountUseCase,
    private readonly markClientNotificationAsReadUseCase: MarkClientNotificationAsReadUseCase,
    private readonly clearClientNotificationsUseCase: ClearClientNotificationsUseCase,
  ) { }

  async getNotifications(clientId: string, dto: GetNotificationsDto) {
    return this.getClientNotificationsUseCase.execute(clientId, dto);
  }

  async getUnreadCount(clientId: string) {
    return this.getClientUnreadCountUseCase.execute(clientId);
  }

  async markAsRead(id: string, clientId: string) {
    return this.markClientNotificationAsReadUseCase.execute(id, clientId);
  }

  async clear(clientId: string) {
    return this.clearClientNotificationsUseCase.execute(clientId);
  }
}
